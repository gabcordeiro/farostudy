-- Fecha o truque do "gabriel+1@gmail.com, gabriel+2@gmail.com..." pra
-- ganhar o bônus de 20 créditos de novo a cada cadastro: normaliza o
-- e-mail (remove +tag sempre; remove pontos e unifica googlemail.com com
-- gmail.com, já que são a mesma caixa de entrada no Google) e só concede
-- o bônus na primeira vez que aquele e-mail normalizado aparece. A conta
-- em si continua sendo criada normalmente -- só o crédito de boas-vindas
-- que passa a ser um por pessoa (pelo menos, por e-mail-base), não um
-- por cadastro.

create or replace function public.normalize_email(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_email text := lower(trim(p_email));
  v_local text := split_part(v_email, '@', 1);
  v_domain text := split_part(v_email, '@', 2);
begin
  -- remove tudo depois de "+" no usuário (gabriel+promo -> gabriel)
  v_local := split_part(v_local, '+', 1);

  -- gmail.com e googlemail.com ignoram pontos no usuário e são a mesma
  -- caixa de entrada -- "g.abriel" e "gabriel" chegam no mesmo lugar.
  if v_domain in ('gmail.com', 'googlemail.com') then
    v_local := replace(v_local, '.', '');
    v_domain := 'gmail.com';
  end if;

  return v_local || '@' || v_domain;
end;
$$;

create table public.welcome_bonus_claims (
  normalized_email text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.welcome_bonus_claims enable row level security;

-- Ninguém acessa direto (nem authenticated, nem anon) -- só a trigger
-- abaixo, que roda como security definer. Mesmo padrão de credit_ledger.
create policy "admin le welcome_bonus_claims"
  on public.welcome_bonus_claims for select
  using (public.is_admin(auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_consent timestamptz := case when new.raw_user_meta_data ->> 'tos_accepted' = 'true'
    then now() end;
  v_normalized text := public.normalize_email(new.email);
begin
  insert into public.profiles (id, display_name, avatar_url, accepted_tos_at, accepted_privacy_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    v_consent,
    v_consent
  );

  -- Só concede o bônus se esse e-mail normalizado nunca reivindicou antes.
  -- O insert com "on conflict do nothing" + o "where exists" do ledger
  -- fazem isso de forma atômica (a constraint unique da PK bloqueia
  -- cadastros concorrentes com o mesmo e-mail normalizado).
  with ins as (
    insert into public.welcome_bonus_claims (normalized_email, user_id)
    values (v_normalized, new.id)
    on conflict (normalized_email) do nothing
    returning 1
  )
  insert into public.credit_ledger (user_id, amount, reason, created_by)
  select new.id, 20, 'bonus de boas-vindas', null
  where exists (select 1 from ins);

  return new;
end;
$$;
