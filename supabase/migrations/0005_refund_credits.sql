-- Estorna creditos do proprio usuario (usado quando a geracao por IA falha
-- depois de ja ter cobrado o credito). So devolve o que a propria edge
-- function debitou minutos antes -- nao ha ganho liquido possivel.
create or replace function public.refund_credits(amount int, reason text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  if amount <= 0 then
    raise exception 'amount deve ser positivo';
  end if;

  insert into public.credit_ledger (user_id, amount, reason, created_by)
  values (auth.uid(), amount, reason, auth.uid());

  select coalesce(sum(l.amount), 0) into new_balance
  from public.credit_ledger l where l.user_id = auth.uid();
  return new_balance;
end;
$$;
