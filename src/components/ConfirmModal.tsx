/**
 * Confirmação genérica antes de uma ação que vale a pena checar de novo
 * (ex: gerar cards com o mesmo texto de novo, arriscando duplicidade).
 * Mesmo padrão visual do ErrorModal -- mascote + texto + par de botões.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Mascot, type MascotMood } from "./Mascot";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  mood?: MascotMood;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Continuar mesmo assim",
  cancelLabel = "Cancelar",
  mood = "search",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Esc fecha (padrão já usado no SearchModal/WelcomeTour) e o botão "seguro"
  // (cancelar) recebe foco ao abrir -- sem isso, o teclado ficava sem jeito
  // de fechar sem clicar, e o foco continuava em quem quer que tenha aberto
  // o modal, escondido atrás do overlay.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => cancelRef.current?.focus(), 30);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 animate-fade-in bg-page/80" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="animate-rise-in fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border border-hairline bg-elevated p-6 text-center shadow-pop"
      >
        <div className="flex justify-center">
          <Mascot size="lg" mood={mood} alt="" />
        </div>
        <h2 id="confirm-modal-title" className="mt-4 font-display text-lg text-paper">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-muted">{description}</p>
        <div className="mt-5 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="press flex-1 rounded-sm border border-hairline px-5 py-2.5 text-sm font-medium text-slate-soft hover:text-paper"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="press flex-1 rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-action-ink hover:bg-action-deep"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
