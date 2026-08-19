-- =============================================================================
-- Faro Study - papeis de usuario (user/admin) e sistema de creditos
-- =============================================================================
-- Nao ha processamento de cartao aqui (precisa das chaves do Stripe/gateway
-- do dono do projeto). O que existe: um livro-razao de creditos auditavel,
-- planos publicos, e um fluxo de solicitacao -> aprovacao manual pelo admin
-- ate a integracao de pagamento de verdade ser plugada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Papel do usuario
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column role text not null default 'user' check (role in ('user', 'admin'));

-- security definer: evita recursao de RLS ao checar o papel dentro de policies
-- de profiles/outras tabelas (a funcao le a tabela ignorando RLS, com seguranca
-- porque so retorna um boolean, nunca dados sensiveis).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role = 'admin' from public.profiles where id = uid), false);
$$;

-- Admin enxerga e edita qualquer profile (alem da policy de dono ja existente).
create policy "profiles: admin le tudo"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

create policy "profiles: admin atualiza tudo"
  on public.profiles for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Planos de creditos (publicos para leitura, admin gerencia)
-- -----------------------------------------------------------------------------
create table public.credit_plans (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  credits    int not null check (credits > 0),
  price_cents int not null check (price_cents >= 0),
  is_active  boolean not null default true,
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_plans enable row level security;

create policy "planos: leitura publica dos ativos"
  on public.credit_plans for select
  using (is_active or public.is_admin(auth.uid()));

create policy "planos: admin gerencia"
  on public.credit_plans for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create trigger touch_credit_plans before update on public.credit_plans
  for each row execute function public.tg_touch_updated_at();

-- -----------------------------------------------------------------------------
-- Livro-razao de creditos (append-only; toda escrita passa por RPC)
-- -----------------------------------------------------------------------------
create table public.credit_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  amount     int not null check (amount <> 0),
  reason     text not null check (char_length(reason) between 1 and 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.credit_ledger enable row level security;
create index on public.credit_ledger (user_id, created_at desc);

create policy "creditos: dono ve o proprio extrato"
  on public.credit_ledger for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));
-- Sem policy de insert/update/delete: toda escrita passa pelas funcoes abaixo.

create view public.v_credit_balance
with (security_invoker = on) as
select user_id, coalesce(sum(amount), 0)::int as balance
from public.credit_ledger
group by user_id;

-- Concede creditos (compra aprovada, bonus, ajuste). Somente admin.
create or replace function public.grant_credits(target_user uuid, amount int, reason text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'apenas admin pode conceder creditos';
  end if;
  if amount <= 0 then
    raise exception 'amount deve ser positivo';
  end if;

  insert into public.credit_ledger (user_id, amount, reason, created_by)
  values (target_user, amount, reason, auth.uid());

  select coalesce(sum(amount), 0) into new_balance
  from public.credit_ledger where user_id = target_user;
  return new_balance;
end;
$$;

-- Consome creditos do proprio usuario autenticado (chamado pelas edge functions
-- de IA). Bloqueia se saldo insuficiente.
create or replace function public.consume_credits(amount int, reason text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance int;
  new_balance int;
begin
  if amount <= 0 then
    raise exception 'amount deve ser positivo';
  end if;

  select coalesce(sum(l.amount), 0) into current_balance
  from public.credit_ledger l where l.user_id = auth.uid();

  if current_balance < amount then
    raise exception 'saldo insuficiente' using errcode = 'P0001';
  end if;

  insert into public.credit_ledger (user_id, amount, reason, created_by)
  values (auth.uid(), -amount, reason, auth.uid());

  new_balance := current_balance - amount;
  return new_balance;
end;
$$;

-- Admin muda o papel de um usuario (nunca o proprio, evita se auto-rebaixar
-- por engano deixando o sistema sem admin).
create or replace function public.set_user_role(target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'apenas admin pode alterar papel de usuario';
  end if;
  if new_role not in ('user', 'admin') then
    raise exception 'papel invalido';
  end if;
  if target_user = auth.uid() then
    raise exception 'nao e possivel alterar o proprio papel';
  end if;

  update public.profiles set role = new_role where id = target_user;
end;
$$;

-- Lista usuarios para o painel admin (id, email, papel, saldo). auth.users nao
-- e exposto via PostgREST, entao isso precisa de security definer.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text,
  role text,
  balance int,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.id,
    u.email,
    p.display_name,
    p.avatar_url,
    p.role,
    coalesce(b.balance, 0) as balance,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.v_credit_balance b on b.user_id = p.id
  where public.is_admin(auth.uid())
  order by p.created_at desc;
$$;

-- -----------------------------------------------------------------------------
-- Solicitacoes de compra (fluxo manual ate o gateway de pagamento ser plugado)
-- -----------------------------------------------------------------------------
create table public.credit_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  plan_id     uuid not null references public.credit_plans (id) on delete restrict,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

alter table public.credit_requests enable row level security;
create index on public.credit_requests (status, created_at desc);

create policy "solicitacoes: dono ve as proprias, admin ve tudo"
  on public.credit_requests for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "solicitacoes: dono cria a propria, sempre pendente"
  on public.credit_requests for insert
  with check (auth.uid() = user_id and status = 'pending');
-- Sem policy de update/delete: resolucao passa pela funcao abaixo.

create or replace function public.resolve_credit_request(request_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
  plan record;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'apenas admin pode resolver solicitacoes';
  end if;

  select * into req from public.credit_requests where id = request_id;
  if req is null then
    raise exception 'solicitacao nao encontrada';
  end if;
  if req.status <> 'pending' then
    raise exception 'solicitacao ja foi resolvida';
  end if;

  if approve then
    select * into plan from public.credit_plans where id = req.plan_id;
    perform public.grant_credits(req.user_id, plan.credits, 'compra aprovada: ' || plan.name);
    update public.credit_requests
      set status = 'approved', resolved_at = now(), resolved_by = auth.uid()
      where id = request_id;
  else
    update public.credit_requests
      set status = 'rejected', resolved_at = now(), resolved_by = auth.uid()
      where id = request_id;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Bonus de boas-vindas + planos iniciais
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));

  insert into public.credit_ledger (user_id, amount, reason, created_by)
  values (new.id, 20, 'bonus de boas-vindas', null);

  return new;
end;
$$;

insert into public.credit_plans (name, credits, price_cents, position) values
  ('Inicial', 50, 990, 1),
  ('Essencial', 150, 2490, 2),
  ('Intensivo', 400, 5490, 3)
on conflict do nothing;
