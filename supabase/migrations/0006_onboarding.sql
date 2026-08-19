-- Faro Study - marca quando o usuario concluiu o tour de boas-vindas.
-- Sem RLS nova: a policy de dono em profiles ja cobre este update.
alter table public.profiles
  add column onboarded_at timestamptz;
