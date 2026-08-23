/**
 * Avisos não-bloqueantes (ex: "Gerando cards com IA...", "12 cards criados").
 * Pilha no canto, entrada fluida, some sozinho. Sem cor de fundo saturada,
 * sem faixa lateral colorida -- só um marcador circular pequeno por tipo.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "info" | "success" | "error";

/** Ação opcional -- vira um botão no aviso (ex.: "Ver quiz"). */
interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  notify: (message: string, type?: ToastType, durationMs?: number, action?: ToastAction) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DOT_COLOR: Record<ToastType, string> = {
  info: "bg-focus-soft",
  success: "bg-good",
  error: "bg-bad",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: ToastType = "info", durationMs = 4000, action?: ToastAction) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, type, message, action }]);
      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-sm border border-hairline bg-elevated px-4 py-3 shadow-pop animate-toast-in"
          >
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${DOT_COLOR[t.type]}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-paper">{t.message}</p>
              {t.action ? (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="press mt-1.5 rounded-sm bg-focus px-2.5 py-1 text-2xs font-medium text-paper hover:bg-focus-deep"
                >
                  {t.action.label}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fechar aviso"
              className="shrink-0 text-slate-muted hover:text-paper"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}
