-- Eventos do calendário do usuário (ex.: alerta de prova). Aparecem no
-- calendário do painel. Cada um é do próprio usuário (RLS).
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  kind text not null default 'custom' check (kind in ('exam', 'custom')),
  deck_id uuid references public.decks(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "calendar_events: dono tudo"
  on public.calendar_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index calendar_events_user_date_idx on public.calendar_events (user_id, event_date);
