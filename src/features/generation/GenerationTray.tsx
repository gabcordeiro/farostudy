/**
 * Bandeja de status flutuante e persistente. Fica fixa na tela e acompanha o
 * usuário por qualquer menu enquanto uma geração roda -- e mostra o desfecho
 * ("pronto" / "falhou") com uma ação para ir direto ao resultado. É o sinal
 * "na cara" que faltava: antes o único aviso era um toast que sumia.
 *
 * Toasts (Toast.tsx) continuam dando o "ping" de conclusão; a bandeja é o
 * indicador durável do trabalho em andamento.
 */
import { useNavigate } from "react-router-dom";
import { IconCheck, IconQuiz, IconWand } from "@/components/icons";
import { useGeneration } from "./GenerationProvider";
import type { GenJob } from "./types";

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-hairline border-t-focus"
    />
  );
}

export function GenerationTray() {
  const { jobs, acknowledge } = useGeneration();
  const navigate = useNavigate();

  // Mostra o que ainda importa: gerações rodando e desfechos ainda não vistos.
  const active = jobs.filter((j) => j.status === "running" || !j.acknowledged);
  if (active.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-80"
    >
      {active.map((job) => (
        <TrayCard key={job.id} job={job} navigate={navigate} onAck={() => acknowledge(job.id)} />
      ))}
    </div>
  );
}

function TrayCard({
  job,
  navigate,
  onAck,
}: {
  job: GenJob;
  navigate: ReturnType<typeof useNavigate>;
  onAck: () => void;
}) {
  const kindLabel = job.kind === "quiz" ? "quiz" : "cards";
  const KindIcon = job.kind === "quiz" ? IconQuiz : IconWand;

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start gap-3 rounded-md border border-hairline bg-elevated px-4 py-3 shadow-pop animate-rise-in"
    >
      {job.status === "running" ? (
        <Spinner />
      ) : job.status === "done" ? (
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-good/15">
          <IconCheck className="h-3 w-3 text-good" title="Concluído" />
        </span>
      ) : (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bad" aria-hidden="true" />
      )}

      <div className="min-w-0 flex-1">
        {job.status === "running" ? (
          <>
            <p className="flex items-center gap-1.5 text-sm text-paper">
              <KindIcon className="h-3.5 w-3.5 text-focus-soft" />
              Gerando {kindLabel}…
            </p>
            <p className="mt-0.5 truncate text-2xs text-slate-muted">
              {job.deckTitle} · pode continuar navegando
            </p>
          </>
        ) : job.status === "done" ? (
          <>
            <p className="text-sm text-paper">
              {job.kind === "quiz"
                ? `Quiz pronto · ${job.quiz?.items.length ?? 0} perguntas`
                : `${job.cards?.created ?? 0} cards criados`}
            </p>
            <p className="mt-0.5 truncate text-2xs text-slate-muted">{job.deckTitle}</p>
            <div className="mt-2">
              {job.kind === "quiz" ? (
                <button
                  type="button"
                  onClick={() => {
                    onAck();
                    navigate("/quiz", { state: { playQuizJobId: job.id } });
                  }}
                  className="press rounded-sm bg-action px-3 py-1.5 text-2xs font-medium text-ink-900 hover:bg-action-deep"
                >
                  Abrir quiz
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onAck();
                    navigate(`/trilhas/${job.deckId}`);
                  }}
                  className="press rounded-sm bg-action px-3 py-1.5 text-2xs font-medium text-ink-900 hover:bg-action-deep"
                >
                  Ver na trilha
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-paper">Não foi possível gerar o {kindLabel}.</p>
            <p className="mt-0.5 text-2xs text-slate-muted">{job.errorMessage}</p>
            {job.insufficientCredits ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    onAck();
                    navigate("/planos");
                  }}
                  className="press rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:border-focus hover:text-paper"
                >
                  Ver planos
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onAck}
        aria-label="Dispensar aviso"
        className="shrink-0 text-slate-muted hover:text-paper"
      >
        &times;
      </button>
    </div>
  );
}
