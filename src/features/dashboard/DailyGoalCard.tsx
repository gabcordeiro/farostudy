/**
 * Meta diária: quantos cards a pessoa já revisou hoje contra a meta que ela
 * definiu no perfil (padrão 20). Barra de progresso + mensagem. Vira verde ao
 * bater a meta.
 */
import { Link } from "react-router-dom";
import { IconTarget } from "@/components/icons";
import { useCountUp } from "@/lib/useCountUp";

export function DailyGoalCard({ reviewedToday, goal }: { reviewedToday: number; goal: number }) {
  const safeGoal = Math.max(1, goal);
  const pct = Math.min(100, Math.round((reviewedToday / safeGoal) * 100));
  const done = reviewedToday >= safeGoal;
  const count = useCountUp(reviewedToday);
  const remaining = Math.max(0, safeGoal - reviewedToday);

  return (
    <div className="flex h-full flex-col rounded-md border border-slate-border bg-ink-700 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-action/15 text-action">
          <IconTarget className="h-5 w-5" />
        </span>
        <span className="text-2xs uppercase tracking-wider text-slate-muted">Meta diária</span>
      </div>

      <p className="font-display text-3xl text-paper tabular-nums">
        {count}
        <span className="text-lg text-slate-muted"> / {safeGoal}</span>
      </p>
      <p className="text-2xs text-slate-muted">cards revisados hoje</p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-surface">
        <div
          className={`h-full rounded-sm transition-all duration-500 ease-fluid ${done ? "bg-good" : "bg-action"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className={`mt-2 text-2xs ${done ? "text-good" : "text-slate-muted"}`}>
        {done ? "Meta batida hoje! Mandou bem." : `Faltam ${remaining} para bater a meta.`}
      </p>

      {!done ? (
        <Link
          to="/estudar"
          className="press mt-auto inline-block pt-3 text-2xs text-action underline underline-offset-2"
        >
          Estudar agora
        </Link>
      ) : null}
    </div>
  );
}
