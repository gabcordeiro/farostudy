// =============================================================================
// Edge Function: send-push
// Chamada periodicamente (pg_cron): para cada usuário com lembrete ativo, se
// for a hora escolhida no fuso dele, ainda não tiver sido avisado hoje e houver
// cards vencidos, envia um push para os dispositivos dele.
//
// Segredos necessários (Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  (par gerado para o app)
//   VAPID_SUBJECT      (ex.: mailto:contato@farostudy.vercel.app)
//   CRON_SECRET        (mesmo valor que o pg_cron envia em x-cron-secret)
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Trava simples: só quem tem o segredo do cron dispara o envio.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "forbidden" }, 403);
  }

  // .trim(): a causa mais comum de "Vapid public key must be a URL safe
  // Base 64" e um espaco/quebra de linha colado junto ao definir a secret
  // no painel do Supabase -- aconteceu de verdade aqui (toda execucao do
  // cron desde que foi ligado vinha derrubando a funcao com esse erro).
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")?.trim();
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")?.trim();
  const subject = Deno.env.get("VAPID_SUBJECT")?.trim() || "mailto:contato@farostudy.vercel.app";
  if (!vapidPublic || !vapidPrivate) {
    return json({ ok: false, reason: "VAPID nao configurado" }, 200);
  }
  webpush.setVapidDetails(subject, vapidPublic, vapidPrivate);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, timezone, reminder_hour, last_reminder_on")
    .eq("reminder_enabled", true);
  if (error) return json({ error: error.message }, 500);

  const now = new Date();
  let sent = 0;

  for (const p of profiles ?? []) {
    const tz = p.timezone || "America/Sao_Paulo";
    let localHour: number;
    let localDate: string;
    try {
      localHour =
        Number(
          new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: tz }).format(now),
        ) % 24;
      localDate = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now); // YYYY-MM-DD
    } catch {
      continue; // fuso inválido -> ignora
    }

    if (localHour !== p.reminder_hour) continue;
    if (p.last_reminder_on === localDate) continue;

    const { count } = await supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", p.id)
      .lte("due_at", now.toISOString())
      .neq("state", "suspended");
    if (!count) continue;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", p.id);

    const payload = JSON.stringify({
      title: "Hora de estudar",
      body: `Você tem ${count} card${count === 1 ? "" : "s"} para revisar hoje.`,
      url: "/estudar",
      tag: "faro-reminder",
    });

    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode ?? 0;
        // Assinatura morta (removida pelo navegador): limpa.
        if (code === 404 || code === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }

    await supabase.from("profiles").update({ last_reminder_on: localDate }).eq("id", p.id);
  }

  return json({ ok: true, sent });
});
