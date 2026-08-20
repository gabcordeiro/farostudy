-- =============================================================================
-- settle_mercadopago_payment: devolver null quando o pagamento nao existe
-- =============================================================================
-- Antes levantava excecao, e o webhook so conseguia distinguir esse caso
-- casando a string da mensagem de erro -- fragil, quebra em qualquer mudanca
-- de redacao. Agora "nao existe" e um retorno normal (null), o que deixa o
-- webhook responder 200 e encerrar a notificacao.
--
-- Por que importa: o Mercado Pago reenfileira a notificacao em toda resposta
-- que nao for 2xx. Uma external_reference que nunca vai existir ficaria sendo
-- reentregue para sempre.
--
-- Contrato de retorno:
--   true  -> creditou agora
--   false -> nada a fazer (duplicata, ou pagamento nao aprovado)
--   null  -> pagamento inexistente (falha permanente, nao retentar)
-- =============================================================================
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
    return null;
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

revoke execute on function public.settle_mercadopago_payment(uuid, text, text) from public, anon, authenticated;
