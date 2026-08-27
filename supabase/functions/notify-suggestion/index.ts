// =============================================================================
// Edge Function: notify-suggestion
// Salva a sugestão de melhoria do usuário (aparece em /admin) e, se possível,
// manda um e-mail de aviso pro time -- só um segundo canal, best-effort: se o
// e-mail falhar ou o RESEND_API_KEY não estiver configurado, a sugestão já
// está salva de qualquer forma (o painel admin é a fonte de verdade).
//
// Deploy:
//   supabase functions deploy notify-suggestion --no-verify-jwt
//   supabase secrets set RESEND_API_KEY=xxx           # opcional
//   supabase secrets set SUGGESTION_EMAIL=voce@... # opcional, default abaixo
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_TARGET_EMAIL = "farostudy.contato@gmail.com";
const MAX_LEN = 4000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nao autenticado" }, 401);

  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Sessao invalida" }, 401);

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalido" }, 400);
  }

  const message = (body.message ?? "").trim();
  if (message.length < 1 || message.length > MAX_LEN) {
    return json({ error: "Mensagem invalida" }, 400);
  }

  // Segunda tentativa, best-effort: manda um e-mail via Resend ANTES de
  // gravar, so pra poder salvar o resultado (email_sent) junto no mesmo
  // insert -- evita precisar de uma policy de update so pra isso (suggestions
  // so tem policy de insert/select, de proposito, no mesmo padrao restrito de
  // error_logs). Sem RESEND_API_KEY configurada, so pula -- a sugestao e
  // salva de qualquer forma, o painel admin e a fonte de verdade.
  let emailSent = false;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    const targetEmail = Deno.env.get("SUGGESTION_EMAIL") ?? DEFAULT_TARGET_EMAIL;
    try {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Faro Study <onboarding@resend.dev>",
          to: [targetEmail],
          subject: "Nova sugestao no Faro Study",
          text: `De: ${userData.user.email ?? userData.user.id}\n\n${message}`,
        }),
      });
      emailSent = res.ok;
    } catch {
      // Falha de rede no envio nao deve derrubar a resposta -- a sugestao
      // ainda vai ser salva, que e o que realmente importa.
    }
  }

  // Insert com o client do proprio usuario -- RLS ("suggestions: dono insere")
  // garante que so ele pode gravar em seu proprio nome.
  const { error: insertErr } = await supabase
    .from("suggestions")
    .insert({ user_id: userData.user.id, message, email_sent: emailSent });
  if (insertErr) {
    return json({ error: "Falha ao salvar sugestao", detail: insertErr.message }, 500);
  }

  return json({ ok: true });
});
