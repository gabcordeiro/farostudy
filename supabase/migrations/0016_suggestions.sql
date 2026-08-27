-- Sugestões de melhoria enviadas pelo usuário ("Ajuda a melhorar", em
-- /ajuda). Mesmo padrão do error_logs: o próprio usuário só insere, só admin
-- lê (não é um histórico pessoal, é uma caixa de entrada do time).
create table public.suggestions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  message     text not null check (char_length(message) between 1 and 4000),
  -- melhor esforço: true quando o e-mail de aviso pro time foi enviado com
  -- sucesso (ver edge function notify-suggestion). Falha no e-mail nunca
  -- bloqueia a sugestão de ser salva -- o painel admin é a fonte de verdade.
  email_sent  boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.suggestions enable row level security;

create policy "suggestions: dono insere"
  on public.suggestions for insert
  with check (auth.uid() = user_id);

create policy "suggestions: admin le"
  on public.suggestions for select
  using (public.is_admin(auth.uid()));

create index suggestions_created_at_idx on public.suggestions (created_at desc);
