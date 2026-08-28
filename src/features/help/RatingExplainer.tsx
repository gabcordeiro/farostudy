/**
 * Corpo da explicação da nota Errei/Difícil/Bom/Fácil -- sem título nem caixa
 * própria, para caber tanto dentro do painel da StudyPage (que traz seu
 * próprio título + moldura) quanto dentro do <details> da página de Ajuda
 * (onde o título já é a pergunta do sumário).
 */
import { RATING_EXPLAINER } from "./content";

interface Props {
  /** Quando presente, mostra um botão "Entendi" que chama isso ao clicar. */
  onDismiss?: () => void;
}

export function RatingExplainer({ onDismiss }: Props) {
  return (
    <>
      <p className="text-sm leading-relaxed text-slate-muted">{RATING_EXPLAINER.intro}</p>
      <ul className="mt-3 space-y-1.5">
        {RATING_EXPLAINER.levels.map((l) => (
          <li key={l.label} className="text-sm leading-relaxed text-slate-muted">
            <strong className="text-slate-soft">{l.label}:</strong> {l.body}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-slate-muted">{RATING_EXPLAINER.outro}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="press mt-4 rounded-sm bg-action px-4 py-2 text-sm font-medium text-action-ink hover:bg-action-deep"
        >
          Entendi
        </button>
      ) : null}
    </>
  );
}
