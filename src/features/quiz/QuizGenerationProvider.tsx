/**
 * Estado GLOBAL da geração de quiz. Antes, gerar um quiz vivia dentro da
 * QuizPage: se a pessoa saísse da tela, o indicador de "gerando" sumia e,
 * ao voltar, não havia nada mostrando que ainda estava rodando. Aqui a
 * geração roda no provider (sobrevive à navegação), o resultado fica guardado
 * até a tela consumir, e um indicador na navegação mostra que há um quiz a
 * caminho -- clicável de volta para /quiz.
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
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { AppFunctionError } from "@/lib/functionError";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { generateQuiz, type QuizItem } from "./generateQuiz";
import type { BancaKey } from "./bancas";

interface Generating {
  deckId: string;
  deckTitle: string;
}
interface PendingResult {
  deckId: string;
  items: QuizItem[];
}
interface GenError {
  code: string | null;
  insufficientCredits: boolean;
}

interface QuizGenContextValue {
  /** Preenchido enquanto um quiz está sendo gerado (sobrevive à navegação). */
  generating: Generating | null;
  /** Resultado pronto aguardando a QuizPage exibir. */
  pendingResult: PendingResult | null;
  /** Erro da última geração, para a QuizPage mostrar o modal/aviso. */
  error: GenError | null;
  start: (args: { deckId: string; deckTitle: string; count: number; banca: BancaKey }) => void;
  /** A QuizPage chama ao exibir o quiz -- limpa o resultado pendente. */
  consumeResult: () => PendingResult | null;
  clearError: () => void;
}

const QuizGenContext = createContext<QuizGenContextValue | undefined>(undefined);

export function QuizGenerationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { notify, dismiss } = useToast();
  const navigate = useNavigate();

  const [generating, setGenerating] = useState<Generating | null>(null);
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);
  const [error, setError] = useState<GenError | null>(null);
  // Trava síncrona: evita duas gerações simultâneas mesmo antes do estado pintar.
  const runningRef = useRef(false);

  const consumeResult = useCallback(() => {
    let taken: PendingResult | null = null;
    setPendingResult((prev) => {
      taken = prev;
      return null;
    });
    return taken;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const start = useCallback(
    ({
      deckId,
      deckTitle,
      count,
      banca,
    }: {
      deckId: string;
      deckTitle: string;
      count: number;
      banca: BancaKey;
    }) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setError(null);
      setGenerating({ deckId, deckTitle });

      const toastId = notify(
        `Gerando quiz de "${deckTitle}"... pode continuar navegando.`,
        "info",
        0,
        { label: "Ver quiz", onClick: () => navigate("/quiz") },
      );

      void (async () => {
        try {
          const res = await generateQuiz({ deckId, count, banca });
          dismiss(toastId);
          if (res.items.length === 0) {
            notify("O Faro não conseguiu montar o quiz. Tente outra trilha.", "error");
            return;
          }
          // Salva a bateria (RLS garante que é do próprio usuário).
          if (user) {
            await withJwtRetry(() =>
              supabase
                .from("quiz_sets")
                .insert({ user_id: user.id, deck_id: deckId, items: res.items, banca }),
            );
          }
          setPendingResult({ deckId, items: res.items });
          notify(`Quiz de "${deckTitle}" pronto.`, "success", 6000, {
            label: "Abrir",
            onClick: () => navigate("/quiz"),
          });
        } catch (err) {
          dismiss(toastId);
          if (err instanceof AppFunctionError && err.insufficientCredits) {
            setError({ code: null, insufficientCredits: true });
            notify("Créditos insuficientes para gerar o quiz.", "error");
          } else {
            setError({
              code: err instanceof AppFunctionError ? (err.code ?? null) : null,
              insufficientCredits: false,
            });
            notify("Não foi possível gerar o quiz agora.", "error");
          }
        } finally {
          setGenerating(null);
          runningRef.current = false;
        }
      })();
    },
    [notify, dismiss, navigate, user],
  );

  const value = useMemo(
    () => ({ generating, pendingResult, error, start, consumeResult, clearError }),
    [generating, pendingResult, error, start, consumeResult, clearError],
  );

  return <QuizGenContext.Provider value={value}>{children}</QuizGenContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useQuizGeneration(): QuizGenContextValue {
  const ctx = useContext(QuizGenContext);
  if (!ctx) throw new Error("useQuizGeneration deve ser usado dentro de <QuizGenerationProvider>");
  return ctx;
}
