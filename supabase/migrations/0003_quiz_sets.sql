-- =============================================================================
-- Faro Cards - baterias de quiz salvas
-- Guarda o quiz gerado pelo Gemini (perguntas + alternativas) para o usuario
-- poder refazer sem gastar uma nova chamada de IA. RLS estrita por dono.
-- =============================================================================

create table public.quiz_sets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  deck_id    uuid not null references public.decks (id) on delete cascade,
  -- [{ cardId, front, choices: [{ text, isCorrect }] }, ...]
  items      jsonb not null,
  item_count int not null generated always as (jsonb_array_length(items)) stored,
  created_at timestamptz not null default now()
);

alter table public.quiz_sets enable row level security;
create index on public.quiz_sets (user_id, deck_id, created_at desc);

create policy "quiz_sets: dono tudo"
  on public.quiz_sets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.tg_quiz_sets_deck_owner()
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

create trigger check_quiz_sets_deck before insert or update on public.quiz_sets
  for each row execute function public.tg_quiz_sets_deck_owner();
