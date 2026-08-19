/**
 * Heatmap de Consistência (estilo contribuições do GitHub).
 * Mostra a ofensiva (streak) de dias estudados nas últimas 53 semanas.
 * Rampa de UMA cor (indigo/foco) + pico em laranja. Sem arco-íris, sem neon. (#4)
 */
import { useMemo } from "react";
import type { DayActivity } from "./dashboard.types";
import { IconFlame } from "@/components/icons";

interface Props {
  activity: DayActivity[];
  currentStreak: number;
  longestStreak: number;
}

const WEEKS = 53;
const DAY_MS = 86400000;
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Rampa monocromatica (foco) + tier de pico (ação). Índice 0 = sem estudo.
const LEVEL_FILL = ["#1A2234", "#2C2A6B", "#3F3BAE", "#5B57D6", "#F2762E"];

function levelFor(reviews: number, max: number): number {
  if (reviews <= 0) return 0;
  if (max <= 0) return 1;
  const ratio = reviews / max;
  if (ratio > 0.85) return 4;
  if (ratio > 0.55) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

export function ConsistencyHeatmap({ activity, currentStreak, longestStreak }: Props) {
  const { columns, maxReviews, monthTicks, total } = useMemo(() => {
    const map = new Map(activity.map((a) => [a.day, a]));
    // Alinha o fim da grade ao sabado da semana atual.
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY_MS);

    const cols: { day: string; reviews: number; correct: number; date: Date }[][] = [];
    const ticks: { col: number; label: string }[] = [];
    let max = 0;
    let sum = 0;
    let lastMonth = -1;

    const cursor = new Date(start);
    for (let w = 0; w < WEEKS; w++) {
      const col: { day: string; reviews: number; correct: number; date: Date }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = cursor.toISOString().slice(0, 10);
        const rec = map.get(key);
        const reviews = rec?.reviews ?? 0;
        max = Math.max(max, reviews);
        sum += reviews;
        col.push({ day: key, reviews, correct: rec?.correct ?? 0, date: new Date(cursor) });
        if (d === 0 && cursor.getMonth() !== lastMonth) {
          ticks.push({ col: w, label: MONTHS[cursor.getMonth()] });
          lastMonth = cursor.getMonth();
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(col);
    }
    return { columns: cols, maxReviews: max, monthTicks: ticks, total: sum };
  }, [activity]);

  const cell = 12;
  const gap = 3;
  const padTop = 18;
  const padLeft = 26;
  const width = padLeft + WEEKS * (cell + gap);
  const height = padTop + 7 * (cell + gap);
  const dayLabels = ["", "Seg", "", "Qua", "", "Sex", ""];

  return (
    <section className="rounded-md border border-slate-border bg-ink-700 p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-paper">Consistência</h2>
          <p className="text-2xs uppercase tracking-wider text-slate-muted">
            {total} revisões nas últimas 53 semanas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <IconFlame className="text-action" title="Ofensiva atual" />
            <span className="text-2xl font-semibold tabular-nums text-paper">{currentStreak}</span>
            <span className="text-xs text-slate-muted">dias seguidos</span>
          </div>
          <div className="hidden border-l border-slate-border pl-4 sm:block">
            <span className="text-lg font-semibold tabular-nums text-slate-soft">{longestStreak}</span>
            <span className="ml-1 text-xs text-slate-muted">recorde</span>
          </div>
        </div>
      </header>

      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Mapa de consistência: ${total} revisões, ofensiva atual de ${currentStreak} dias.`}
          className="min-w-full"
        >
          {monthTicks.map((t) => (
            <text
              key={`${t.col}-${t.label}`}
              x={padLeft + t.col * (cell + gap)}
              y={12}
              className="fill-slate-muted"
              fontSize="10"
            >
              {t.label}
            </text>
          ))}
          {dayLabels.map((label, row) =>
            label ? (
              <text
                key={label}
                x={0}
                y={padTop + row * (cell + gap) + cell - 1}
                className="fill-slate-muted"
                fontSize="9"
              >
                {label}
              </text>
            ) : null,
          )}
          {columns.map((col, ci) =>
            col.map((c, ri) => {
              const level = levelFor(c.reviews, maxReviews);
              const inFuture = c.date.getTime() > Date.now();
              return (
                <rect
                  key={c.day}
                  x={padLeft + ci * (cell + gap)}
                  y={padTop + ri * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={2}
                  fill={inFuture ? "transparent" : LEVEL_FILL[level]}
                  stroke={inFuture ? "transparent" : "#0B0F17"}
                  strokeWidth={1}
                >
                  <title>
                    {c.reviews > 0
                      ? `${c.reviews} revisões (${c.correct} certas) em ${c.day}`
                      : `Sem estudo em ${c.day}`}
                  </title>
                </rect>
              );
            }),
          )}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-2xs text-slate-muted">
        <span>menos</span>
        {LEVEL_FILL.map((fill, i) => (
          <span
            key={i}
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: fill }}
            aria-hidden="true"
          />
        ))}
        <span>mais</span>
      </div>
    </section>
  );
}
