/**
 * Tour de boas-vindas (estilo app): passo a passo em um modal, mostrado uma
 * única vez por usuário. A conclusão fica gravada em profiles.onboarded_at,
 * então acompanha a conta -- não o navegador.
 * Pode ser reaberto a qualquer momento pela página de Ajuda.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "@/components/Mascot";
import { TOUR_STEPS } from "./content";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Chamado quando o usuário termina ou pula (grava onboarded_at). */
  onFinish?: () => void;
}

export function WelcomeTour({ open, onClose, onFinish }: Props) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const finish = useCallback(() => {
    onFinish?.();
    onClose();
  }, [onFinish, onClose]);

  // Fecha com Esc, como qualquer modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open || !current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-page/80 p-4 sm:items-center"
    >
      <div className="w-full max-w-md animate-rise-in rounded-md border border-hairline bg-elevated p-6 shadow-pop">
        <div className="flex justify-center">
          <Mascot size="lg" mood={current.mood} alt="" />
        </div>

        <h2 id="tour-title" className="mt-5 text-center font-display text-xl text-paper">
          {current.title}
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-muted">
          {current.body}
        </p>

        {/* Indicador de passo */}
        <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-sm transition-all duration-200 ${
                i === step ? "w-6 bg-action" : "w-1.5 bg-hairline"
              }`}
            />
          ))}
        </div>
        <p className="sr-only">
          Passo {step + 1} de {TOUR_STEPS.length}
        </p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-2xs text-slate-muted hover:text-paper"
          >
            Pular tour
          </button>

          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-sm border border-hairline px-4 py-2 text-sm text-slate-soft hover:text-paper"
              >
                Voltar
              </button>
            ) : null}
            {isLast ? (
              <button
                type="button"
                onClick={() => {
                  finish();
                  navigate("/importar");
                }}
                className="rounded-sm bg-action px-5 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
              >
                Criar meus cards
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="rounded-sm bg-action px-5 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
              >
                Próximo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
