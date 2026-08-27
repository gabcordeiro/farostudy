-- Quiz competitivo assíncrono: o criador congela um snapshot das perguntas
-- (independente de quiz_sets, que é privado por dono -- RLS de quiz_sets
-- nunca deixaria um amigo ler o quiz de outra pessoa) e compartilha o link
-- da trilha. Cada amigo responde no próprio tempo e o resultado entra num
-- placar comum.
--
-- Nome/foto de quem joga são gravados junto na tentativa (não lidos de
-- profiles) porque a policy de profiles é "só o dono lê a própria" -- não
-- daria pra montar um placar com o nome dos outros participantes sem isso.
create table public.quiz_challenges (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references auth.users (id) on delete cascade,
  creator_name text,
  title        text not null check (char_length(title) between 1 and 160),
  -- mesmo formato de quiz_sets.items: [{ cardId, front, choices: [{text, isCorrect}] }]
  items        jsonb not null,
  item_count   int not null generated always as (jsonb_array_length(items)) stored,
  created_at   timestamptz not null default now()
);

alter table public.quiz_challenges enable row level security;

create policy "quiz_challenges: autenticado cria a propria"
  on public.quiz_challenges for insert
  with check (auth.uid() = creator_id);

-- Legivel por qualquer autenticado -- o id (uuid imprevisivel) e o convite;
-- nao ha listagem publica de desafios de outra pessoa.
create policy "quiz_challenges: autenticado le"
  on public.quiz_challenges for select
  using (auth.uid() is not null);

create table public.quiz_challenge_attempts (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.quiz_challenges (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  score        int not null check (score >= 0),
  total        int not null check (total > 0),
  duration_ms  int check (duration_ms >= 0),
  created_at   timestamptz not null default now(),
  -- uma tentativa por pessoa por desafio -- sem policy de update, entao nao
  -- da pra tentar de novo pra melhorar a nota (mantem o placar honesto).
  unique (challenge_id, user_id)
);

alter table public.quiz_challenge_attempts enable row level security;
create index on public.quiz_challenge_attempts (challenge_id, score desc);

create policy "quiz_challenge_attempts: autenticado registra a propria"
  on public.quiz_challenge_attempts for insert
  with check (auth.uid() = user_id);

create policy "quiz_challenge_attempts: autenticado le"
  on public.quiz_challenge_attempts for select
  using (auth.uid() is not null);
