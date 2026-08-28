/**
 * Cookie banner (checklist produção #17). Sóbrio, sem glassmorphism.
 * Persiste a escolha localmente; analytics só carrega após consentimento.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "faro.cookie-consent.v1";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(KEY));
  }, []);

  function decide(value: "accepted" | "rejected") {
    localStorage.setItem(KEY, value);
    setVisible(false);
    if (value === "accepted") {
      window.dispatchEvent(new CustomEvent("faro:analytics-consent"));
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-border bg-ink-800/95 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-soft">
          Usamos cookies essenciais e, com sua permissão, de análise para melhorar o Faro
          Study. Leia nossa{" "}
          <Link to="/privacidade" className="text-action underline underline-offset-2">
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide("rejected")}
            className="press flex-1 rounded-sm border border-slate-border px-3 py-2 text-sm text-slate-soft hover:border-slate-muted sm:flex-none"
          >
            Somente essenciais
          </button>
          <button
            onClick={() => decide("accepted")}
            className="press flex-1 rounded-sm bg-action px-3 py-2 text-sm font-medium text-action-ink hover:bg-action-deep sm:flex-none"
          >
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );
}
