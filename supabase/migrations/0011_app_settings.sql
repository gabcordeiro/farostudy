-- Aparência global do app, controlada pelo admin e lida por todos (inclusive
-- visitantes na landing). Linha única (id = 1). O JSON `appearance` guarda a
-- fonte do app e o fundo (sólido/gradiente/padrão/imagem) para os temas claro
-- e escuro. A escrita é só do admin, via RPC security definer.
create table public.app_settings (
  id int primary key default 1 check (id = 1),
  appearance jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.app_settings enable row level security;

-- Todo mundo lê (a aparência vale para o site inteiro, logado ou não).
grant select on public.app_settings to anon, authenticated;
create policy "app_settings: todos leem" on public.app_settings for select using (true);

-- Nenhuma policy de escrita: só a RPC abaixo (security definer) grava.
insert into public.app_settings (id, appearance) values (1, '{}'::jsonb)
on conflict (id) do nothing;

create or replace function public.set_app_appearance(p_appearance jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'apenas admin pode alterar a aparência';
  end if;
  insert into public.app_settings (id, appearance, updated_at, updated_by)
  values (1, p_appearance, now(), auth.uid())
  on conflict (id) do update
    set appearance = excluded.appearance,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

revoke execute on function public.set_app_appearance(jsonb) from anon;
grant execute on function public.set_app_appearance(jsonb) to authenticated;
