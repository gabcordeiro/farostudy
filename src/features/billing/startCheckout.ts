/**
 * Invoca a edge function `create-payment`, que cria a cobrança no Mercado Pago
 * e devolve a URL do Checkout Pro. O token do Mercado Pago fica só no servidor;
 * o preço vem de `credit_plans`, nunca daqui.
 */
import { supabase } from "@/lib/supabase";
import { AppFunctionError, describeFunctionError } from "@/lib/functionError";

export interface CheckoutResult {
  checkoutUrl: string;
  paymentId: string;
}

export async function startCheckout(planId: string): Promise<CheckoutResult> {
  const { data, error } = await supabase.functions.invoke<CheckoutResult>("create-payment", {
    body: { planId },
  });
  if (error) throw new AppFunctionError(await describeFunctionError(error));
  if (!data?.checkoutUrl) throw new Error("Resposta vazia da função");
  return data;
}
