-- Interruptor pra pausar o quiz competitivo sem tirar código do ar: o
-- admin desliga quando quiser via /admin > Recursos, sem precisar mexer
-- em deploy nenhum pra religar depois.
alter table public.app_settings
  add column quiz_challenges_enabled boolean not null default false;

create or replace function public.set_quiz_challenges_enabled(p_enabled boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'apenas admin pode alterar essa configuracao';
  end if;
  update public.app_settings
    set quiz_challenges_enabled = p_enabled, updated_at = now(), updated_by = auth.uid()
    where id = 1;
end;
$$;

revoke execute on function public.set_quiz_challenges_enabled(boolean) from anon;
grant execute on function public.set_quiz_challenges_enabled(boolean) to authenticated;
