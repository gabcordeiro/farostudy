/**
 * Meta Pixel. Carregado sob demanda (ver src/components/Analytics.tsx) só
 * depois do consentimento de cookies de análise -- nunca no carregamento
 * inicial da página. Sem VITE_ANALYTICS_ID configurado, tudo aqui é no-op,
 * então funciona em dev/preview sem pixel nenhum.
 */
import { env } from "./env";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[] };
  }
}

let loaded = false;

export function initAnalytics(): void {
  if (loaded) return;
  const pixelId = env.VITE_ANALYTICS_ID;
  if (!pixelId || window.fbq) return;
  loaded = true;

  // Snippet oficial do Meta Pixel, sem os comentários de marketing.
  const fbq: Window["fbq"] = function (...args: unknown[]) {
    if (fbq!.callMethod) fbq!.callMethod(...args);
    else fbq!.queue!.push(args);
  };
  fbq!.queue = [];
  window.fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

/** Chamar a cada troca de rota (SPA não recarrega, então o pixel não vê sozinho). */
export function trackPageView(): void {
  window.fbq?.("track", "PageView");
}

/** Eventos padrão do Meta (CompleteRegistration, InitiateCheckout, Purchase, ...). */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  window.fbq?.("track", name, params);
}
