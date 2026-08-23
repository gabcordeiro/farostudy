/**
 * Camada global de geração por IA. O grande ganho: a chamada roda AQUI, no
 * provider persistente do app, e não dentro da página. Assim o usuário pode
 * trocar de menu (Trilhas, Painel, etc.) enquanto o Faro gera -- o status
 * continua visível na bandeja (GenerationTray) e nos badges do menu, e o
 * resultado é recuperado quando ele volta.
 *
 * Também centraliza aqui o que antes se repetia nas duas páginas: os toasts de
 * conclusão, o aviso de "não feche a aba" e a gravação da bateria de quiz.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { AppFunctionError } from "@/lib/functionError";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { generateCards } from "@/features/ai/generateCards";
import { generateQuiz } from "@/features/quiz/generateQuiz";
import type { AiGenerateInput } from "@/lib/validation";
import type { GenJob, GenKind } from "./types";

interface GenerationContextValue {
  jobs: GenJob[];
  /** Geração em andamento de um tipo, se houver. */
  runningByKind: (kind: GenKind) => GenJob | undefined;
  /** Job concluído mais recente de um tipo para uma trilha (para a página recuperar). */
  latestDoneByDeck: (kind: GenKind, deckId: string) => GenJob | undefined;
  /** true se há geração rodando ou concluída ainda não vista -- alimenta os badges do menu. */
  hasActivity: (kind: GenKind) => boolean;
  /** Inicia a geração de cards e devolve o id do job para a página acompanhar. */
  startCards: (input: AiGenerateInput, deckTitle: string) => string;
  /** Inicia a geração de quiz e devolve o id do job para a página acompanhar. */
  startQuiz: (input: { deckId: string; count?: number }, deckTitle: string) => string;
  /** Marca o desfecho como visto (limpa a bandeja e os badges sem apagar o job). */
  acknowledge: (id: string) => void;
  /** Remove o job de vez. */
  dismiss: (id: string) => void;
}

const GenerationContext = createContext<GenerationContextValue | undefined>(undefined);

function errorInfo(err: unknown, fallback: string) {
  if (err instanceof AppFunctionError) {
    return {
      errorMessage: err.message,
      errorCode: err.code ?? null,
      insufficientCredits: err.insufficientCredits,
    };
  }
  return { errorMessage: fallback, errorCode: null, insufficientCredits: false };
}

export function GenerationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [jobs, setJobs] = useState<GenJob[]>([]);

  const patch = useCallback((id: string, changes: Partial<GenJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...changes } : j)));
  }, []);

  const startCards = useCallback(
    (input: AiGenerateInput, deckTitle: string): string => {
      const id = crypto.randomUUID();
      const job: GenJob = {
        id,
        kind: "cards",
        deckId: input.deckId,
        deckTitle,
        status: "running",
        startedAt: Date.now(),
        acknowledged: false,
      };
      setJobs((prev) => [...prev, job]);
      void (async () => {
        try {
          const res = await generateCards(input);
          patch(id, { status: "done", finishedAt: Date.now(), cards: res });
          notify(
            res.created > 0
              ? `${res.created} cards criados em ${deckTitle}.`
              : "Nenhum card foi gerado desta vez.",
            res.created > 0 ? "success" : "error",
          );
        } catch (err) {
          const info = errorInfo(err, "Não foi possível gerar os cards agora.");
          patch(id, { status: "error", finishedAt: Date.now(), ...info });
          notify(info.errorMessage, "error");
        }
      })();
      return id;
    },
    [notify, patch],
  );

  const startQuiz = useCallback(
    (input: { deckId: string; count?: number }, deckTitle: string): string => {
      const id = crypto.randomUUID();
      const job: GenJob = {
        id,
        kind: "quiz",
        deckId: input.deckId,
        deckTitle,
        status: "running",
        startedAt: Date.now(),
        acknowledged: false,
      };
      setJobs((prev) => [...prev, job]);
      const uid = user?.id;
      void (async () => {
        try {
          const res = await generateQuiz(input);
          if (res.items.length === 0) {
            patch(id, {
              status: "error",
              finishedAt: Date.now(),
              errorMessage: "O Faro não conseguiu montar o quiz agora. Tente outra trilha.",
              errorCode: null,
              insufficientCredits: false,
            });
            notify("Não foi possível montar o quiz.", "error");
            return;
          }
          // Salva a bateria (mesma gravação de useQuizSets.save) para poder
          // refazer sem gastar uma nova chamada de IA. Feito aqui para persistir
          // mesmo que a página do quiz já tenha sido desmontada.
          if (uid) {
            await withJwtRetry(() =>
              supabase.from("quiz_sets").insert({ user_id: uid, deck_id: input.deckId, items: res.items }),
            );
          }
          patch(id, { status: "done", finishedAt: Date.now(), quiz: { items: res.items } });
          notify(`Quiz com ${res.items.length} perguntas pronto e salvo.`, "success");
        } catch (err) {
          const info = errorInfo(err, "Não foi possível gerar o quiz agora.");
          patch(id, { status: "error", finishedAt: Date.now(), ...info });
          notify(info.errorMessage, "error");
        }
      })();
      return id;
    },
    [notify, patch, user],
  );

  const acknowledge = useCallback((id: string) => patch(id, { acknowledged: true }), [patch]);
  const dismiss = useCallback((id: string) => setJobs((prev) => prev.filter((j) => j.id !== id)), []);

  const runningByKind = useCallback(
    (kind: GenKind) => jobs.find((j) => j.kind === kind && j.status === "running"),
    [jobs],
  );
  const latestDoneByDeck = useCallback(
    (kind: GenKind, deckId: string) =>
      [...jobs].reverse().find((j) => j.kind === kind && j.deckId === deckId && j.status === "done"),
    [jobs],
  );
  const hasActivity = useCallback(
    (kind: GenKind) =>
      jobs.some((j) => j.kind === kind && (j.status === "running" || !j.acknowledged)),
    [jobs],
  );

  // Avisa antes de fechar a aba enquanto algo é gerado -- o crédito já foi
  // debitado, então sair no meio desperdiça a geração. Global: vale para
  // qualquer página, já que o job vive aqui.
  const anyRunning = jobs.some((j) => j.status === "running");
  useEffect(() => {
    if (!anyRunning) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [anyRunning]);

  const value = useMemo<GenerationContextValue>(
    () => ({
      jobs,
      runningByKind,
      latestDoneByDeck,
      hasActivity,
      startCards,
      startQuiz,
      acknowledge,
      dismiss,
    }),
    [jobs, runningByKind, latestDoneByDeck, hasActivity, startCards, startQuiz, acknowledge, dismiss],
  );

  return <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGeneration(): GenerationContextValue {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error("useGeneration deve ser usado dentro de <GenerationProvider>");
  return ctx;
}
