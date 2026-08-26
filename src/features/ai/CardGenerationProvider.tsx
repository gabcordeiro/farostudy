/**
 * Estado GLOBAL da geração de cards -- mesmo padrão do QuizGenerationProvider.
 * Antes, gerar cards vivia só na GeneratePage: saindo da tela, perdia o
 * indicador de "gerando"; e se o Gemini falhasse (fica indisponível de vez em
 * quando, sobretudo na primeira chamada), o único jeito de tentar de novo era
 * preencher tudo outra vez. Agora a geração roda aqui (sobrevive à
 * navegação), um indicador na navegação mostra que há uma geração em
 * andamento, e falha guarda o último input pra um botão "Tentar de novo"
 * simplesmente repetir a mesma chamada.
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
import { AppFunctionError } from "@/lib/functionError";
import { useToast } from "@/components/Toast";
import { generateCards, type GenerateResult } from "./generateCards";

export type GenerateMode = "text" | "json";

interface StartInput {
  deckId: string;
  deckTitle: string;
  mode: GenerateMode;
  content: string;
  maxCards: number;
}
interface Generating {
  deckId: string;
  deckTitle: string;
}
interface PendingResult {
  deckId: string;
  result: GenerateResult;
}
interface GenError {
  code: string | null;
  insufficientCredits: boolean;
}

interface CardGenContextValue {
  /** Preenchido enquanto uma geração está rodando (sobrevive à navegação). */
  generating: Generating | null;
  /** Resultado pronto aguardando a GeneratePage exibir. */
  pendingResult: PendingResult | null;
  /** Erro da última geração, para a GeneratePage mostrar o modal/aviso. */
  error: GenError | null;
  start: (input: StartInput) => void;
  /** Repete a última geração com o mesmo input (botão "Tentar de novo"). */
  retry: () => void;
  /** A GeneratePage chama ao exibir o resultado -- limpa o pendente. */
  consumeResult: () => PendingResult | null;
  clearError: () => void;
}

const CardGenContext = createContext<CardGenContextValue | undefined>(undefined);

export function CardGenerationProvider({ children }: { children: ReactNode }) {
  const { notify, dismiss } = useToast();
  const navigate = useNavigate();

  const [generating, setGenerating] = useState<Generating | null>(null);
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);
  const [error, setError] = useState<GenError | null>(null);
  // Trava síncrona: evita duas gerações simultâneas mesmo antes do estado pintar.
  const runningRef = useRef(false);
  const lastInputRef = useRef<StartInput | null>(null);

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
    (input: StartInput) => {
      if (runningRef.current) return;
      runningRef.current = true;
      lastInputRef.current = input;
      setError(null);
      setGenerating({ deckId: input.deckId, deckTitle: input.deckTitle });

      const toastId = notify(
        `Gerando cards de "${input.deckTitle}"... pode continuar navegando.`,
        "info",
        0,
        { label: "Ver geração", onClick: () => navigate("/importar") },
      );

      void (async () => {
        try {
          const res = await generateCards({
            deckId: input.deckId,
            mode: input.mode,
            content: input.content,
            maxCards: input.maxCards,
          });
          dismiss(toastId);
          setPendingResult({ deckId: input.deckId, result: res });
          notify(
            res.created > 0
              ? `${res.created} cards de "${input.deckTitle}" prontos.`
              : `Nenhum card foi gerado de "${input.deckTitle}" dessa vez.`,
            res.created > 0 ? "success" : "error",
            6000,
            res.created > 0 ? { label: "Abrir", onClick: () => navigate("/importar") } : undefined,
          );
        } catch (err) {
          dismiss(toastId);
          if (err instanceof AppFunctionError && err.insufficientCredits) {
            setError({ code: null, insufficientCredits: true });
            notify("Créditos insuficientes para gerar os cards.", "error");
          } else {
            setError({
              code: err instanceof AppFunctionError ? (err.code ?? null) : null,
              insufficientCredits: false,
            });
            // O pedido explícito era esse: em vez de só "desistir", o aviso
            // de erro já vem com um jeito de tentar de novo sem reconfigurar
            // trilha/texto -- comum a API do Gemini falhar só na primeira
            // tentativa e funcionar na segunda.
            notify("Não foi possível gerar os cards agora.", "error", 8000, {
              label: "Tentar de novo",
              onClick: () => start(input),
            });
          }
        } finally {
          setGenerating(null);
          runningRef.current = false;
        }
      })();
    },
    [notify, dismiss, navigate],
  );

  const retry = useCallback(() => {
    if (lastInputRef.current) start(lastInputRef.current);
  }, [start]);

  const value = useMemo(
    () => ({ generating, pendingResult, error, start, retry, consumeResult, clearError }),
    [generating, pendingResult, error, start, retry, consumeResult, clearError],
  );

  return <CardGenContext.Provider value={value}>{children}</CardGenContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCardGeneration(): CardGenContextValue {
  const ctx = useContext(CardGenContext);
  if (!ctx) throw new Error("useCardGeneration deve ser usado dentro de <CardGenerationProvider>");
  return ctx;
}
