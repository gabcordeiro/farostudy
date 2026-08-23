-- Meta diária de cards revisados (usada no card "Meta diária" do painel).
-- Padrão de 20; editável no perfil. Faixa sã para não quebrar a barra.
alter table public.profiles
  add column daily_goal int not null default 20 check (daily_goal between 1 and 500);
