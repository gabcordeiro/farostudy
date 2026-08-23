/**
 * "Seu progresso" -- mini gráfico de linha das revisões dos últimos 7 dias.
 * Reaproveita a mesma série diária do heatmap (nenhum dado novo). Paleta
 * sóbria: linha indigo/foco + área suave, laranja só no ponto de hoje.
 */
import { useMemo } from "react";
import type { DayActivity } from "./dashboard.types";

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function WeeklyProgress({ activity }: { activity: DayActivity[] }) {
  const days = useMemo(() => {
    const map = new Map(activity.map((a) => [a.day, a.reviews]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: { label: string; reviews: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ label: i === 0 ? "Hoje" : WD[d.getDay()], reviews: map.get(key) ?? 0 });
    }
    return out;
  }, [activity]);

  const total = days.reduce((s, d) => s + d.reviews, 0);
  const max = Math.max(1, ...days.map((d) => d.reviews));

  const W = 560;
  const H = 130;
  const padX = 10;
  const padTop = 12;
  const padBottom = 22;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const pts = days.map((d, i) => ({
    x: padX + (i / (days.length - 1)) * innerW,
    y: padTop + (1 - d.reviews / max) * innerH,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${padTop + innerH} L${pts[0].x.toFixed(1)} ${padTop + innerH} Z`;

  return (
    <section className="rounded-md border border-slate-border bg-ink-700 p-5">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-paper">Seu progresso</h2>
          <p className="text-2xs uppercase tracking-wider text-slate-muted">Revisões nos últimos 7 dias</p>
        </div>
        <p className="text-sm text-slate-muted">
          <span className="font-mono text-paper">{total}</span> na semana
        </p>
      </header>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Revisões por dia nos últimos 7 dias: ${days.map((d) => `${d.label} ${d.reviews}`).join(", ")}.`}
      >
        <path d={area} fill="#5B57D6" fillOpacity={0.14} />
        <path d={line} fill="none" stroke="#5B57D6" strokeWidth={2} strokeLinejoin="round" />
        {pts.map((p, i) => {
          const isToday = i === pts.length - 1;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={isToday ? 4 : 2.5} fill={isToday ? "#F2762E" : "#5B57D6"} />
              <text x={p.x} y={H - 6} fontSize="10" textAnchor="middle" className="fill-slate-muted">
                {days[i].label}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
