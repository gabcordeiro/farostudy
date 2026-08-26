/**
 * Modal de erro inesperado (ex.: Gemini fora do ar). O cliente nunca vê o
 * detalhe técnico -- só uma mensagem genérica e, quando a falha foi
 * registrada em error_logs, um código curto para relatar o problema. O
 * admin busca esse código em /admin > Erros para ver o detalhe real.
 */
import { createPortal } from "react-dom";
import { Mascot } from "./Mascot";

interface ErrorModalProps {
  open: boolean;
  code?: string | null;
  onClose: () => void;
  /** Quando informado, mostra um botão "Tentar de novo" ao lado de "Entendi" --
   * ex.: Gemini fora do ar momentaneamente, vale tentar de novo sem reconfigurar tudo. */
  onRetry?: () => void;
}

export function ErrorModal({ open, code, onClose, onRetry }: ErrorModalProps) {
  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 animate-fade-in bg-page/80" onClick={onClose} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        className="animate-rise-in fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border border-hairline bg-elevated p-6 text-center shadow-pop"
      >
        <div className="flex justify-center">
          <Mascot size="lg" mood="sleepy" alt="" />
        </div>
        <h2 id="error-modal-title" className="mt-4 font-display text-lg text-paper">
          Algo não saiu como esperado
        </h2>
        <p className="mt-2 text-sm text-slate-muted">
          O Faro tentou, mas não conseguiu terminar dessa vez. Tente novamente em instantes.
        </p>
        {code ? (
          <p className="mt-3 font-mono text-2xs text-slate-muted">Código: {code}</p>
        ) : null}
        <div className="mt-5 flex gap-2">
          {onRetry ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="press flex-1 rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep"
            >
              Tentar de novo
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={`press rounded-sm px-5 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
              onRetry
                ? "border border-hairline text-slate-soft hover:text-paper"
                : "w-full bg-action text-ink-900 hover:bg-action-deep"
            }`}
          >
            {onRetry ? "Fechar" : "Entendi"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
