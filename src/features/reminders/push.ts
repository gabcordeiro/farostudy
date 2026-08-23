/**
 * Push do navegador para lembretes de estudo: registra o service worker,
 * pede permissão, assina no PushManager (com a chave pública VAPID) e guarda
 * a assinatura no banco (RLS por dono). Tudo tolerante a browsers sem suporte.
 */
import { supabase } from "@/lib/supabase";

// Chave pública VAPID (pública por definição). Pode vir de env; cai no valor
// embutido para funcionar sem configuração extra no frontend.
const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ??
  "BCb66KaamQ3Th872fdCt-bQM45JfyiaZOjQldZ-KrWVTTYeUWPIb9FB6-p9yjPWGWJJ7Ny4ULcBKmt9gxTnHSK0";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  return existing ?? (await navigator.serviceWorker.register("/sw.js"));
}

/** Ativa: pede permissão, assina e salva. Devolve true se ficou tudo certo. */
export async function enablePush(userId: string): Promise<boolean> {
  if (!pushSupported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // cast: o tipo de aplicationServerKey no lib.dom pede ArrayBuffer "puro".
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    }));

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: "endpoint" },
    );
  return !error;
}

/** Desativa: remove a assinatura do navegador e do banco. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

/** Notificação local de teste (prova o SW/permissão sem depender do servidor). */
export async function sendTestNotification(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await getRegistration();
  await reg.showNotification("Faro Study", {
    body: "Lembrete de teste — é assim que o Faro vai te avisar de estudar.",
    icon: "/favicon-32.png",
    badge: "/favicon-32.png",
    data: { url: "/estudar" },
    tag: "faro-test",
  });
  return true;
}
