/**
 * Componente puro do card em revisão. Renderiza frente/verso com escape
 * anti-XSS e oferece TTS (Web Speech API) para o texto visível.
 */
import { useCallback } from "react";
import { renderCardHtml } from "@/lib/sanitize";
import { IconAudio } from "@/components/icons";
import type { StudyCardRow } from "./useStudyQueue";

interface Props {
  card: StudyCardRow;
  showBack: boolean;
  lang?: string;
}

function speak(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function StudyCard({ card, showBack, lang = "pt-BR" }: Props) {
  const readFront = useCallback(() => speak(card.front, lang), [card.front, lang]);
  const readBack = useCallback(() => speak(card.back, lang), [card.back, lang]);

  return (
    <article className="rounded-md border border-hairline bg-elevated">
      <header className="flex items-center justify-between border-b border-hairline px-4 py-2">
        <span className="text-2xs uppercase tracking-wider text-slate-muted">
          {card.deck_title || "Sem trilha"}
        </span>
        <span className="text-2xs text-slate-muted">
          {card.reps > 0 ? `revisão #${card.reps + 1}` : "primeiro estudo"}
        </span>
      </header>

      <section className="px-6 py-8">
        <div className="flex items-start justify-between gap-3">
          <div
            className="text-lg leading-relaxed text-paper"
            dangerouslySetInnerHTML={{ __html: renderCardHtml(card.front) }}
          />
          <button
            type="button"
            onClick={readFront}
            aria-label="Ouvir a pergunta"
            className="shrink-0 rounded-sm border border-hairline p-1.5 text-slate-soft hover:text-paper"
          >
            <IconAudio className="h-4 w-4" />
          </button>
        </div>

        {card.hint && !showBack ? (
          <p className="mt-4 text-sm italic text-slate-muted">Dica: {card.hint}</p>
        ) : null}

        {showBack ? (
          <div className="mt-6 border-t border-hairline pt-6">
            <div className="flex items-start justify-between gap-3">
              <div
                className="text-base leading-relaxed text-slate-soft"
                dangerouslySetInnerHTML={{ __html: renderCardHtml(card.back) }}
              />
              <button
                type="button"
                onClick={readBack}
                aria-label="Ouvir a resposta"
                className="shrink-0 rounded-sm border border-hairline p-1.5 text-slate-soft hover:text-paper"
              >
                <IconAudio className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </article>
  );
}
