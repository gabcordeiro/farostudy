-- =============================================================================
-- Faro Cards - schema inicial
-- Checklist de seguranca: RLS estrito (#4), lock de registro por dono (#7),
-- bloqueio de field tampering (#8), restricao de upload (#16).
-- Convencao: TODA tabela de dados do usuario carrega `user_id` denormalizado
-- e trava em `auth.uid() = user_id`. Um usuario JAMAIS ve dado de outro.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Util: touch updated_at
-- -----------------------------------------------------------------------------
create or replace function public.tg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- profiles  (1:1 com auth.users)
-- =============================================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  avatar_url   text,
  locale       text not null default 'pt-BR',
  timezone     text not null default 'America/Sao_Paulo',
  -- consentimentos (LGPD / cookie banner)
  accepted_tos_at     timestamptz,
  accepted_privacy_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: dono le"      on public.profiles for select using (auth.uid() = id);
create policy "profiles: dono edita"   on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: dono insere"  on public.profiles for insert with check (auth.uid() = id);

create trigger touch_profiles before update on public.profiles
  for each row execute function public.tg_touch_updated_at();

-- cria profile automaticamente no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- categories  (mapeamento de edital: "Tecnologia da Informacao", "Legislacao")
-- =============================================================================
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  color      text not null default '#5B57D6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;
create index on public.categories (user_id);

create policy "categories: dono tudo"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger touch_categories before update on public.categories
  for each row execute function public.tg_touch_updated_at();

-- =============================================================================
-- decks  (Trilhas de Estudo / blocos de topicos do edital)
-- =============================================================================
create table public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title       text not null check (char_length(title) between 1 and 160),
  description text check (char_length(description) <= 2000),
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.decks enable row level security;
create index on public.decks (user_id);
create index on public.decks (user_id, category_id);

create policy "decks: dono tudo"
  on public.decks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Garante que a categoria referenciada tambem e do usuario (anti field-tampering).
create or replace function public.tg_decks_category_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is not null then
    if not exists (
      select 1 from public.categories c
      where c.id = new.category_id and c.user_id = new.user_id
    ) then
      raise exception 'categoria nao pertence ao usuario';
    end if;
  end if;
  return new;
end;
$$;

create trigger check_decks_category before insert or update on public.decks
  for each row execute function public.tg_decks_category_owner();
create trigger touch_decks before update on public.decks
  for each row execute function public.tg_touch_updated_at();

-- =============================================================================
-- cards  (flashcards + estado de repeticao espacada / SM-2 like)
-- =============================================================================
create type public.card_state as enum ('new', 'learning', 'review', 'relearning', 'suspended');

create table public.cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  deck_id     uuid not null references public.decks (id) on delete cascade,
  -- conteudo (renderizado com escape no front -> anti XSS #15)
  front       text not null check (char_length(front) between 1 and 8000),
  back        text not null check (char_length(back) between 1 and 8000),
  hint        text check (char_length(hint) <= 2000),
  tags        text[] not null default '{}',
  -- proveniencia
  source      text not null default 'manual'
              check (source in ('manual', 'ai_text', 'ai_json', 'ai_file', 'apkg_import')),
  -- estado SRS
  state        public.card_state not null default 'new',
  due_at       timestamptz not null default now(),
  interval_days numeric(8,2) not null default 0,
  ease_factor  numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  reps         int not null default 0,
  lapses       int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.cards enable row level security;
create index on public.cards (user_id);
create index on public.cards (deck_id);
create index on public.cards (user_id, state, due_at); -- fila de revisao do dia

create policy "cards: dono tudo"
  on public.cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.tg_cards_deck_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.decks d
    where d.id = new.deck_id and d.user_id = new.user_id
  ) then
    raise exception 'deck nao pertence ao usuario';
  end if;
  return new;
end;
$$;

create trigger check_cards_deck before insert or update on public.cards
  for each row execute function public.tg_cards_deck_owner();
create trigger touch_cards before update on public.cards
  for each row execute function public.tg_touch_updated_at();

-- =============================================================================
-- reviews  (log imutavel de cada revisao -> alimenta heatmap e retencao)
-- rating: 1=errei(again) 2=dificil(hard) 3=bom(good) 4=facil(easy)
-- =============================================================================
create table public.reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  card_id         uuid not null references public.cards (id) on delete cascade,
  deck_id         uuid not null references public.decks (id) on delete cascade,
  category_id     uuid references public.categories (id) on delete set null,
  rating          smallint not null check (rating between 1 and 4),
  is_correct      boolean not null generated always as (rating >= 3) stored,
  duration_ms     int check (duration_ms >= 0 and duration_ms <= 600000),
  prev_interval   numeric(8,2),
  next_interval   numeric(8,2),
  reviewed_at     timestamptz not null default now(),
  -- dia local do usuario, materializado para o heatmap (preenchido no insert)
  reviewed_on     date
);

alter table public.reviews enable row level security;
create index on public.reviews (user_id, reviewed_at);
create index on public.reviews (user_id, category_id);
create index on public.reviews (user_id, reviewed_on);

-- reviews sao append-only: sem update/delete pelo usuario (integridade do BI).
create policy "reviews: dono le"    on public.reviews for select using (auth.uid() = user_id);
create policy "reviews: dono insere" on public.reviews for insert with check (auth.uid() = user_id);

create or replace function public.tg_reviews_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tz text;
begin
  select coalesce(timezone, 'America/Sao_Paulo') into tz from public.profiles where id = new.user_id;
  new.reviewed_on := (new.reviewed_at at time zone tz)::date;
  return new;
end;
$$;

create trigger set_reviews_defaults before insert on public.reviews
  for each row execute function public.tg_reviews_defaults();

-- =============================================================================
-- import_jobs  (rastreio de importacao de .apkg / geracao por IA)
-- =============================================================================
create table public.import_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  deck_id     uuid references public.decks (id) on delete set null,
  kind        text not null check (kind in ('apkg', 'ai_text', 'ai_json', 'ai_file')),
  storage_path text,
  status      text not null default 'pending'
              check (status in ('pending', 'processing', 'done', 'error')),
  cards_created int not null default 0,
  error_message text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.import_jobs enable row level security;
create index on public.import_jobs (user_id);

create policy "imports: dono tudo"
  on public.import_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger touch_imports before update on public.import_jobs
  for each row execute function public.tg_touch_updated_at();

-- =============================================================================
-- VIEWS de BI  (security_invoker => respeitam a RLS do usuario logado)
-- Retornam apenas o necessario (checklist #17: trim API responses).
-- =============================================================================

-- Heatmap de consistencia: contagem de revisoes por dia local.
create view public.v_daily_activity
with (security_invoker = on) as
select
  user_id,
  reviewed_on              as day,
  count(*)::int            as reviews,
  count(*) filter (where is_correct)::int as correct
from public.reviews
group by user_id, reviewed_on;

-- Retencao por categoria: taxa de acerto e volume (curva de esquecimento).
create view public.v_retention_by_category
with (security_invoker = on) as
select
  r.user_id,
  r.category_id,
  coalesce(c.name, 'Sem categoria') as category_name,
  coalesce(c.color, '#5B57D6')      as category_color,
  count(*)::int                     as total_reviews,
  count(*) filter (where r.is_correct)::int as correct_reviews,
  round(avg((r.is_correct)::int)::numeric, 4) as accuracy
from public.reviews r
left join public.categories c on c.id = r.category_id
group by r.user_id, r.category_id, c.name, c.color;

-- =============================================================================
-- STORAGE: bucket privado para uploads .apkg (checklist #16)
-- Politicas travam o acesso a pasta do proprio usuario: {user_id}/arquivo.apkg
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'apkg-imports',
  'apkg-imports',
  false,
  52428800, -- 50 MB
  array['application/zip', 'application/octet-stream', 'application/x-anki']
)
on conflict (id) do nothing;

create policy "apkg: dono le"
  on storage.objects for select
  using (bucket_id = 'apkg-imports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "apkg: dono envia"
  on storage.objects for insert
  with check (bucket_id = 'apkg-imports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "apkg: dono remove"
  on storage.objects for delete
  using (bucket_id = 'apkg-imports' and (storage.foldername(name))[1] = auth.uid()::text);
