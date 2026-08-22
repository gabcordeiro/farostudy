/**
 * Ponte entre o consentimento de cookies (CookieBanner) e o Meta Pixel
 * (src/lib/analytics.ts): carrega o pixel se o consentimento já existia de
 * uma visita anterior, ou assim que o evento de aceite dispara nesta
 * sessão. Também reporta PageView a cada troca de rota, já que numa SPA o
 * pixel só vê a primeira página sozinho.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "@/lib/analytics";

const CONSENT_KEY = "faro.cookie-consent.v1";

export function Analytics() {
  const location = useLocation();

  useEffect(() => {
    if (localStorage.getItem(CONSENT_KEY) === "accepted") {
      initAnalytics();
      return;
    }
    function onConsent() {
      initAnalytics();
    }
    window.addEventListener("faro:analytics-consent", onConsent);
    return () => window.removeEventListener("faro:analytics-consent", onConsent);
  }, []);

  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  return null;
}
