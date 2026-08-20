-- =============================================================================
-- Faro Study - pagamentos via Mercado Pago (Checkout Pro)
-- =============================================================================
-- Por que nao reusar grant_credits(): aquela funcao exige is_admin(auth.uid()),
-- e o webhook do Mercado Pago roda com service-role, onde auth.uid() e NULL.
-- Dai a RPC propria abaixo, que tambem carrega a trava de idempotencia: o
-- Mercado Pago reenvia a mesma notificacao varias vezes, e sem trava o cliente
-- ganharia credito repetido a cada reenvio.
-- =============================================================================

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  plan_id             uuid not null references public.credit_plans (id) on delete restrict,
  provider            text not null default 'mercadopago',
  provider_payment_id text,
  preference_id       text,
  amount_cents        int not null check (amount_cents >= 0),
  credits             int not null check (credits > 0),
  status              text not null default 'pending'
                        check (status in ('pending', 'approved', 'rejected')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  settled_at          timestamptz
);

alter table public.payments enable row level security;

create index on public.payments (user_id, created_at desc);

-- Idempotencia no nivel do banco: um pagamento do provedor so pode aparecer
-- uma vez. Parcial porque provider_payment_id fica nulo ate a liquidacao.
create unique index payments_provider_payment_uniq
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create policy "pagamentos: dono ve os proprios, admin ve tudo"
  on public.payments for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));
-- Sem policy de insert/update/delete: toda escrita passa pelas funcoes abaixo.

create trigger touch_payments before update on public.payments
  for each row execute function public.tg_touch_updated_at();

-- -----------------------------------------------------------------------------
-- Abre uma tentativa de compra. Chamada pela edge function create-payment com
-- o JWT do usuario. Preco e creditos vem SEMPRE de credit_plans, nunca do
-- cliente -- senao daria para forjar um plano barato no request.
-- -----------------------------------------------------------------------------
create or replace function public.start_payment(p_plan_id uuid)
returns table (payment_id uuid, amount_cents int, credits int, plan_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  plan record;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'nao autenticado';
  end if;

  select * into plan from public.credit_plans where id = p_plan_id and is_active;
  if plan is null then
    raise exception 'plano nao encontrado ou inativo';
  end if;

  insert into public.payments (user_id, plan_id, amount_cents, credits)
  values (auth.uid(), plan.id, plan.price_cents, plan.credits)
  returning id into new_id;

  return query select new_id, plan.price_cents, plan.credits, plan.name;
end;
$$;

-- -----------------------------------------------------------------------------
-- Guarda o preference_id devolvido pelo Mercado Pago (so o dono da linha).
-- -----------------------------------------------------------------------------
create or replace function public.attach_preference(p_payment_id uuid, p_preference_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
     set preference_id = p_preference_id
   where id = p_payment_id
     and user_id = auth.uid();
end;
$$;

-- -----------------------------------------------------------------------------
-- Liquida o pagamento. Idempotente: se a linha ja estiver aprovada, sai sem
-- fazer nada e devolve false. So o service-role executa (o webhook).
-- -----------------------------------------------------------------------------
create or replace function public.settle_mercadopago_payment(
  p_payment_id          uuid,
  p_provider_payment_id text,
  p_status              text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  pay record;
begin
  -- for update: serializa reenvios simultaneos da mesma notificacao.
  select * into pay from public.payments where id = p_payment_id for update;
  if pay is null then
    raise exception 'pagamento nao encontrado';
  end if;

  -- Ja liquidado -> nada a fazer. E o caminho normal dos reenvios.
  if pay.status = 'approved' then
    return false;
  end if;

  if p_status <> 'approved' then
    update public.payments
       set status = 'rejected', provider_payment_id = p_provider_payment_id
     where id = p_payment_id;
    return false;
  end if;

  update public.payments
     set status = 'approved',
         provider_payment_id = p_provider_payment_id,
         settled_at = now()
   where id = p_payment_id;

  -- Insert direto no ledger (e nao via grant_credits) porque aquela funcao
  -- exige is_admin(auth.uid()), que e NULL sob service-role.
  insert into public.credit_ledger (user_id, amount, reason, created_by)
  values (pay.user_id, pay.credits, 'compra via Mercado Pago', null);

  return true;
end;
$$;

-- Ninguem alem do service-role pode liquidar pagamento.
revoke execute on function public.settle_mercadopago_payment(uuid, text, text) from public, anon, authenticated;
