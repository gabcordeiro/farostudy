/**
 * "Continue de onde parou": as trilhas com mais cards vencidos / progresso,
 * com barra de progresso e atalho pra estudar direto. Some quando não há
 * nenhuma trilha com cards.
 */
import { Link } from "react-router-dom";
import { IconPlus, IconRoute } from "@/components/icons";
import { useResumeDecks } from "./useResumeDecks";

export function ResumeSection() {
  const { decks, loading } = useResumeDecks();

  if (loading || decks.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg text-paper">Continue de onde parou</h2>
        <Link to="/trilhas" className="text-2xs text-action underline underline-offset-2">
          Ver todas
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((d) => {
          const pct = Math.min(100, Math.round((d.studied / Math.max(1, d.total)) * 100));
          return (
            <Link
              key={d.id}
              to={`/estudar?deck=${d.id}`}
              className="press group flex flex-col rounded-md border border-slate-border bg-ink-700 p-4 transition-colors duration-150 hover:border-focus"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-focus/15 text-focus-soft">
                  <IconRoute className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-paper">{d.title}</span>
              </div>
              <p className="text-2xs text-slate-muted">
                {d.studied} / {d.total} cards iniciados
                {d.due > 0 ? (
                  <span className="ml-2 rounded-sm bg-action/15 px-1.5 py-0.5 text-action">
                    {d.due} para revisar
                  </span>
                ) : null}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-surface">
                <div className="h-full rounded-sm bg-focus" style={{ width: `${pct}%` }} />
              </div>
            </Link>
          );
        })}

        <Link
          to="/importar"
          className="press flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-border bg-ink-700/50 p-4 text-slate-muted transition-colors duration-150 hover:border-focus hover:text-paper"
        >
          <IconPlus className="h-5 w-5" />
          <span className="text-sm">Nova trilha</span>
        </Link>
      </div>
    </section>
  );
}
