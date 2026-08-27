-- grant_credits tinha um parametro chamado `amount` e um sum(amount) sobre a
-- coluna credit_ledger.amount no mesmo escopo -- Postgres nao sabe qual dos
-- dois usar ("column reference amount is ambiguous"), quebrando toda concessao
-- manual de credito pelo admin. consume_credits/refund_credits ja usavam
-- alias na tabela (l.amount); so grant_credits ficou sem.
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

  select coalesce(sum(l.amount), 0) into new_balance
  from public.credit_ledger l where l.user_id = target_user;
  return new_balance;
end;
$$;
