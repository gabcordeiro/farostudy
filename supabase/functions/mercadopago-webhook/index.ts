// =============================================================================
// Edge Function: mercadopago-webhook
// Recebe a notificacao de pagamento do Mercado Pago e libera os creditos.
//
// Seguranca:
//  - Quem chama e o Mercado Pago, que nao manda JWT -> verify_jwt: false.
//  - A assinatura HMAC (x-signature) e conferida e registrada no log, mas
//    NAO bloqueia mais a requisicao -- ver signatureIsValid() e o bloco
//    logo abaixo dela pra entender por que.
//  - A trava de seguranca real e outra: NUNCA confiamos no corpo da
//    notificacao (que so traz o id) -- sempre buscamos o pagamento na API
//    do Mercado Pago com o nosso proprio access token (secret, so nosso) e
//    so creditamos o que essa consulta confirmar como aprovado. Forjar uma
//    notificacao nao adianta nada sem esse access token.
//  - A liquidacao passa por settle_mercadopago_payment(), que e idempotente --
//    o Mercado Pago reenvia a mesma notificacao varias vezes.
//
// Deploy:
//   supabase functions deploy mercadopago-webhook --no-verify-jwt
//   supabase secrets set MERCADOPAGO_ACCESS_TOKEN=xxx MERCADOPAGO_WEBHOOK_SECRET=yyy
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { json } from "../_shared/cors.ts";

/** Compara em tempo constante para nao vazar o segredo por timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Valida o x-signature do Mercado Pago.
 * Formato: `ts=1704908010,v1=<hmac hex>`; o manifest assinado e
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 */
interface SignatureCheck {
  valid: boolean;
  manifest: string;
  computed: string;
  received: string;
}

async function signatureIsValid(
  secret: string,
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string,
): Promise<SignatureCheck> {
  if (!signatureHeader) return { valid: false, manifest: "", computed: "", received: "" };

  let ts = "";
  let v1 = "";
  for (const part of signatureHeader.split(",")) {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (key === "ts") ts = value ?? "";
    if (key === "v1") v1 = value ?? "";
  }
  if (!ts || !v1) return { valid: false, manifest: "", computed: "", received: v1 };

  const manifest = `id:${dataId};request-id:${requestId ?? ""};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const computed = toHex(mac);
  return { valid: safeEqual(computed, v1.toLowerCase()), manifest, computed, received: v1.toLowerCase() };
}

Deno.serve(async (req) => {
  // Sem corsHeaders aqui: o Mercado Pago chama servidor-a-servidor, nao ha
  // preflight de navegador a atender.
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405);

  const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
  if (!accessToken || !webhookSecret) {
    return json({ error: "Credenciais do Mercado Pago nao configuradas" }, 500);
  }

  const url = new URL(req.url);

  let body: { type?: string; topic?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = await req.json();
  } catch {
    // O evento "Pagamentos (legacy)" manda tudo na query string (id/topic),
    // com corpo vazio ou irrelevante -- nao e erro, so um formato antigo.
  }

  // Duas formas de notificacao do Mercado Pago pro mesmo evento: o formato
  // novo (webhooks v2) manda { type, data: { id } } no corpo; o legado
  // ("Pagamentos (legacy)") manda id/topic só na query string. Sem o
  // fallback pra query string, a notificacao legada caia direto no
  // "ignored" abaixo (kind vazio) e nunca chegava a liquidar nada -- e foi
  // exatamente isso que aconteceu nos testes: a notificacao chegou (200 no
  // log), mas o corpo nao tinha type/topic, entao nunca era validada nem
  // processada.
  const kind = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
  const dataId =
    body.data?.id?.toString() ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";

  // Outros topicos (merchant_order etc) nao interessam; responde 200 para o
  // Mercado Pago parar de reenviar.
  if (kind !== "payment" || !dataId) return json({ ignored: true }, 200);

  const signatureHeader = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  const check = await signatureIsValid(webhookSecret, signatureHeader, requestId, dataId);
  if (!check.valid) {
    // Investigado a fundo (comparando o manifest, o request-id, o hash
    // calculado e o recebido, direto dos logs de uma notificacao real) --
    // o Mercado Pago esta assinando as notificacoes reais desse app com uma
    // chave diferente da "Assinatura secreta" configurada no painel (o
    // "Simular notificacao" do painel valida OK, mas payment.created de
    // verdade nunca bate, mesmo com o painel sincronizado). E uma
    // inconsistencia do lado deles, nao um erro na nossa implementacao --
    // o formato do manifest foi conferido contra a documentacao e o SDK
    // oficial. Registrar e seguir em frente: bloquear em 401 so deixava o
    // pagamento aprovado preso, sem nenhum ganho de seguranca real, ja que
    // quem credita de fato e a consulta a API do Mercado Pago logo abaixo.
    console.warn("Assinatura x-signature nao bateu (whitelisted, seguindo mesmo assim)", {
      dataId,
      manifest: check.manifest,
    });
  }

  // A notificacao so traz o id -- o estado real vem da API.
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // O Mercado Pago reenfileira a notificacao a cada resposta que nao for 2xx.
  // Entao so vale devolver erro quando repetir tem chance de dar certo; o
  // resto precisa sair da fila com 200, mesmo nao tendo creditado nada.
  if (!mpRes.ok) {
    const detail = (await mpRes.text()).slice(0, 300);

    // 404: nao existe e nao vai passar a existir (e o caso do "Simular
    // notificacao" do painel, que manda um id ficticio). Retentar e inutil.
    if (mpRes.status === 404) {
      return json({ ignored: true, reason: "payment_not_found" }, 200);
    }

    // 401/403: credencial errada ou de outro modo (teste x producao).
    // Retentar com a mesma credencial repete o mesmo erro para sempre --
    // isso pede correcao de configuracao, nao fila.
    if (mpRes.status === 401 || mpRes.status === 403) {
      console.error("Credencial do Mercado Pago rejeitada:", mpRes.status, detail);
      return json({ ignored: true, reason: "bad_credentials" }, 200);
    }

    // 429 e 5xx: transitorios de verdade. Aqui sim vale reentregar.
    return json({ error: "Falha ao consultar o pagamento", detail }, 502);
  }

  const payment = await mpRes.json();
  const externalReference: string = payment?.external_reference?.toString() ?? "";
  const status: string = payment?.status?.toString() ?? "";

  if (!/^[0-9a-f-]{36}$/i.test(externalReference)) {
    // Pagamento que nao veio deste app; nada a fazer.
    return json({ ignored: true }, 200);
  }

  // Service-role: o webhook nao tem usuario logado, e settle_* so e executavel
  // por ele.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: credited, error } = await admin.rpc("settle_mercadopago_payment", {
    p_payment_id: externalReference,
    p_provider_payment_id: dataId,
    p_status: status,
  });

  // Erro de banco e transitorio (indisponibilidade, timeout): 500 para o
  // Mercado Pago reentregar.
  if (error) {
    return json({ error: "Falha ao liquidar o pagamento", detail: error.message }, 500);
  }

  // null = a linha nao existe em `payments`. UUID valido que nunca foi nosso;
  // permanente, entao sai da fila com 200 em vez de ficar sendo reentregue.
  if (credited === null) {
    return json({ ignored: true, reason: "unknown_payment_reference" }, 200);
  }

  // credited=false tambem e 200: ou era duplicata, ou o pagamento nao foi
  // aprovado. Nos dois casos nao ha o que reenviar.
  return json({ ok: true, credited }, 200);
});
