/**
 * Bloco de pergunta/alternativas/progresso do quiz -- extraído de QuizPage
 * pra ser reaproveitado também no desafio competitivo (QuizChallengePage),
 * que precisa exatamente da mesma interação de responder/revelar/avançar.
 */
import { renderCardHtml } from "@/lib/sanitize";
import { IconCheck, IconClose } from "@/components/icons";
import type { QuizChoice } from "./generateQuiz";

const LETTERS = ["A", "B", "C", "D"];

export interface RunnerItem {
  cardId: string;
  front: string;
  shuffled: QuizChoice[];
}

interface QuizRunnerProps {
  current: RunnerItem;
  index: number;
  total: number;
  score: { correct: number; total: number };
  answer: number | null;
  onAnswer: (choiceIdx: number) => void;
  onNext: () => void;
  isLast: boolean;
}

export function QuizRunner({ current, index, total, score, answer, onAnswer, onNext, isLast }: QuizRunnerProps) {
  return (
    <div key={current.cardId} className="animate-rise-in space-y-4">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <p className="text-2xs uppercase tracking-wider text-slate-muted">
            Pergunta {Math.min(index + 1, total)} de {total}
          </p>
          <p className="text-2xs text-slate-muted">
            Placar <span className="font-mono text-paper">{score.correct}/{score.total}</span>
          </p>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-sm bg-surface">
          <div
            className="h-full bg-focus transition-all duration-300"
            style={{ width: `${((index + (answer !== null ? 1 : 0)) / total) * 100}%` }}
          />
        </div>
      </div>

      <article className="rounded-md border border-hairline bg-elevated px-5 py-6">
        <p className="mb-2 text-2xs uppercase tracking-wider text-focus-soft">Pergunta</p>
        <div
          className="text-xl leading-relaxed text-paper"
          dangerouslySetInnerHTML={{ __html: renderCardHtml(current.front) }}
        />
      </article>

      <ul className="space-y-2">
        {current.shuffled.map((ch, i) => {
          const chosen = answer === i;
          const revealed = answer !== null;
          const isRight = ch.isCorrect;
          const tone = !revealed
            ? "border-hairline hover:border-focus"
            : isRight
              ? "border-good bg-good/10"
              : chosen
                ? "border-bad bg-bad/10"
                : "border-hairline opacity-60";
          const badgeTone = !revealed
            ? "border-hairline text-slate-muted"
            : isRight
              ? "border-good text-good"
              : chosen
                ? "border-bad text-bad"
                : "border-hairline text-slate-muted";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => onAnswer(i)}
                className={`press flex w-full items-center gap-3 rounded-sm border bg-elevated px-4 py-3 text-left text-sm text-paper ${tone}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border font-mono text-2xs ${badgeTone}`}
                >
                  {LETTERS[i]}
                </span>
                <span className="flex-1">{ch.text}</span>
                {revealed && isRight ? (
                  <IconCheck className="h-4 w-4 shrink-0 text-good" title="Resposta correta" />
                ) : revealed && chosen ? (
                  <IconClose className="h-4 w-4 shrink-0 text-bad" title="Resposta errada" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {answer !== null ? (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onNext}
            className="press rounded-sm bg-focus px-4 py-2 text-sm font-medium text-paper hover:bg-focus-deep"
          >
            {isLast ? "Ver resultado" : "Próxima"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
