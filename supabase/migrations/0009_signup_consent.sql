-- =============================================================================
-- Registrar o consentimento de Termos/Privacidade no cadastro (LGPD) e
-- aproveitar a foto do Google quando o cadastro vem de lá.
-- profiles.accepted_tos_at/accepted_privacy_at existem desde 0001_init.sql
-- mas nunca eram preenchidas -- o front agora manda tos_accepted no metadata
-- do signUp, e essa trigger passa a gravar o timestamp junto com o profile.
-- O OAuth do Google preenche raw_user_meta_data com avatar_url/picture
-- (a mesma URL nas duas chaves, dependendo da versão do provider) -- usamos
-- isso como foto inicial em vez de deixar o perfil sem avatar.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_consent timestamptz := case when new.raw_user_meta_data ->> 'tos_accepted' = 'true'
    then now() end;
begin
  insert into public.profiles (id, display_name, avatar_url, accepted_tos_at, accepted_privacy_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    v_consent,
    v_consent
  );

  insert into public.credit_ledger (user_id, amount, reason, created_by)
  values (new.id, 20, 'bonus de boas-vindas', null);

  return new;
end;
$$;

-- Backfill: contas já existentes sem foto que entraram via Google ganham a
-- foto de lá agora. Só preenche quando avatar_url está nulo -- nunca troca
-- uma foto que o usuário já enviou pelo Perfil.
update public.profiles p
set avatar_url = coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
where u.id = p.id
  and p.avatar_url is null
  and coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') is not null;
