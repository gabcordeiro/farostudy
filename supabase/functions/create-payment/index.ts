// =============================================================================
// Edge Function: create-payment
// Abre uma tentativa de compra e devolve a URL do Checkout Pro do Mercado Pago.
//
// Seguranca:
//  - MERCADOPAGO_ACCESS_TOKEN vive so aqui (Deno.env), nunca no frontend.
//  - Exige o JWT do usuario; preco e creditos vem de credit_plans via
//    start_payment(), nunca do corpo do request -- senao daria para forjar
//    um plano barato e receber creditos de um caro.
//
// Deploy:
//   supabase functions deploy create-payment --no-verify-jwt
//   supabase secrets set MERCADOPAGO_ACCESS_TOKEN=xxx APP_ORIGIN=https://...
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const MP_PREFERENCES_URL = "https://api.mercadopago.com/checkout/preferences";

interface StartedPayment {
  payment_id: string;
  amount_cents: number;
  credits: number;
  plan_name: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405);

  const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  if (!accessToken) return json({ error: "MERCADOPAGO_ACCESS_TOKEN nao configurada" }, 500);

  const appOrigin = Deno.env.get("APP_ORIGIN") ?? "https://farostudy.vercel.app";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nao autenticado" }, 401);

  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Sessao invalida" }, 401);

  let body: { planId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalido" }, 400);
  }

  const planId = body.planId?.toString() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(planId)) return json({ error: "planId invalido" }, 400);

  // Abre a linha em `payments` e devolve valor/creditos vindos do banco.
  const { data: started, error: startErr } = await supabase
    .rpc("start_payment", { p_plan_id: planId })
    .single<StartedPayment>();
  if (startErr || !started) {
    return json({ error: "Falha ao iniciar o pagamento", detail: startErr?.message }, 400);
  }

  const preference = {
    items: [
      {
        id: planId,
        title: `Faro Study - ${started.plan_name}`,
        description: `${started.credits} creditos para gerar cards e quizzes`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: started.amount_cents / 100,
      },
    ],
    payer: { email: userData.user.email },
    // Amarra a notificacao de volta ao usuario e ao plano.
    external_reference: started.payment_id,
    notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    back_urls: {
      success: `${appOrigin}/planos?pagamento=approved`,
      failure: `${appOrigin}/planos?pagamento=failure`,
      pending: `${appOrigin}/planos?pagamento=pending`,
    },
    auto_return: "approved",
    // Boleto fora: compensa em dias, e o cliente ficaria sem credito nesse meio
    // tempo. Pix e cartao aprovam na hora.
    payment_methods: { excluded_payment_types: [{ id: "ticket" }] },
    statement_descriptor: "FAROSTUDY",
  };

  const res = await fetch(MP_PREFERENCES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Evita preferencia duplicada se a chamada for repetida.
      "X-Idempotency-Key": started.payment_id,
    },
    body: JSON.stringify(preference),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json(
      { error: "Falha ao criar a cobranca", detail: detail.slice(0, 300) },
      502,
    );
  }

  const pref = await res.json();
  const checkoutUrl: string | undefined = pref?.init_point ?? pref?.sandbox_init_point;
  if (!checkoutUrl) return json({ error: "Mercado Pago nao devolveu a URL de checkout" }, 502);

  await supabase.rpc("attach_preference", {
    p_payment_id: started.payment_id,
    p_preference_id: pref?.id?.toString() ?? null,
  });

  return json({ checkoutUrl, paymentId: started.payment_id });
});
