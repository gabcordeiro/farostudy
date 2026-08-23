/**
 * Tipos da camada global de geração por IA. Um "job" representa uma geração
 * (cards ou quiz) que roda no provider -- e não na página -- para sobreviver à
 * troca de menu: o usuário pode navegar livremente enquanto o Faro trabalha.
 */
import type { GenerateResult } from "@/features/ai/generateCards";
import type { QuizItem } from "@/features/quiz/generateQuiz";

export type GenKind = "cards" | "quiz";
export type GenStatus = "running" | "done" | "error";

export interface GenJob {
  id: string;
  kind: GenKind;
  deckId: string;
  deckTitle: string;
  status: GenStatus;
  startedAt: number;
  finishedAt?: number;
  /** Resultado da geração de cards (status "done", kind "cards"). */
  cards?: GenerateResult;
  /** Resultado da geração de quiz (status "done", kind "quiz"). */
  quiz?: { items: QuizItem[] };
  /** Detalhes do erro (status "error"). */
  errorMessage?: string;
  errorCode?: string | null;
  insufficientCredits?: boolean;
  /**
   * Se o usuário já "viu" o desfecho (clicou numa ação da bandeja ou fechou).
   * Controla o que a bandeja mostra e os badges do menu -- não apaga o job,
   * que continua disponível para a página recuperar o resultado.
   */
  acknowledged?: boolean;
}
