-- Lembretes de estudo por push do navegador.
-- Assinaturas de push (uma por dispositivo/navegador).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subs: dono tudo"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Preferências do lembrete no profile. O horário é comparado no fuso do
-- usuário (profiles.timezone, capturado ao ativar). last_reminder_on evita
-- mandar duas vezes no mesmo dia.
alter table public.profiles
  add column reminder_enabled boolean not null default false,
  add column reminder_hour int not null default 19 check (reminder_hour between 0 and 23),
  add column last_reminder_on date;
