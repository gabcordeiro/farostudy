/**
 * BI de Retencao (Curva de Esquecimento).
 * - Curva R = e^(-t/S) projetando a retencao da categoria mais fragil.
 * - Ranking das categorias com menor taxa de acerto e quando revisar.
 * Paleta sobria: trilha em foco/indigo, alerta em laranja. Sem checkmarks, sem emoji.
 */
import { useMemo, useState } from "react";
import type { CategoryRetention } from "./dashboard.types";
import { predictedRetention } from "@/lib/srs";
import { IconArrowDownRight, IconTarget } from "@/components/icons";

interface Props {
  retention: CategoryRetention[];
  overallAccuracy: number;
}

const TARGET = 0.9;
const HORIZON = 30; // dias projetados

function curvePath(stabilityDays: number, w: number, h: number, padX: number, padY: number): string {
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const pts: string[] = [];
  for (let d = 0; d <= HORIZON; d++) {
    const r = predictedRetention(d, stabilityDays);
    const x = padX + (d / HORIZON) * innerW;
    const y = padY + (1 - r) * innerH;
    pts.push(`${d === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

export function RetentionBI({ retention, overallAccuracy }: Props) {
  const ranked = useMemo(
    () => [...retention].sort((a, b) => a.accuracy - b.accuracy),
    [retention],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    ranked[0]?.categoryId ?? null,
  );
  const selected =
    ranked.find((r) => r.categoryId === selectedId) ?? ranked[0] ?? null;

  const w = 520;
  const h = 200;
  const padX = 34;
  const padY = 18;

  const dipDay = selected
    ? Array.from({ length: HORIZON + 1 }).findIndex(
        (_, d) => predictedRetention(d, selected.stabilityDays) < TARGET,
      )
    : -1;

  return (
    <section className="rounded-md border border-slate-border bg-ink-700 p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-paper">Retencao por trilha</h2>
          <p className="text-2xs uppercase tracking-wider text-slate-muted">
            Curva de esquecimento e projecao de desempenho
          </p>
        </div>
        <div className="flex items-center gap-2 text-right">
          <IconTarget className="text-focus-soft" title="Acerto geral" />
          <div>
            <span className="text-2xl font-semibold tabular-nums text-paper">
              {Math.round(overallAccuracy * 100)}%
            </span>
            <span className="ml-1 text-xs text-slate-muted">acerto geral</span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Curva de esquecimento da categoria selecionada */}
        <div>
          {selected ? (
            <>
              <svg
                viewBox={`0 0 ${w} ${h}`}
                className="w-full"
                role="img"
                aria-label={`Curva de esquecimento de ${selected.name}. Retencao cai abaixo de 90% em ${
                  dipDay >= 0 ? `${dipDay} dias` : "mais de 30 dias"
                }.`}
              >
                {/* grade horizontal */}
                {[0, 0.25, 0.5, 0.75, 1].map((g) => {
                  const y = padY + (1 - g) * (h - padY * 2);
                  return (
                    <g key={g}>
                      <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="#243044" strokeWidth={1} />
                      <text x={4} y={y + 3} fontSize="9" className="fill-slate-muted">
                        {Math.round(g * 100)}
                      </text>
                    </g>
                  );
                })}
                {/* linha alvo 90% */}
                <line
                  x1={padX}
                  x2={w - padX}
                  y1={padY + (1 - TARGET) * (h - padY * 2)}
                  y2={padY + (1 - TARGET) * (h - padY * 2)}
                  stroke="#F2762E"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
                {/* area sob a curva */}
                <path
                  d={`${curvePath(selected.stabilityDays, w, h, padX, padY)} L${w - padX} ${
                    h - padY
                  } L${padX} ${h - padY} Z`}
                  fill="#3F3BAE"
                  fillOpacity={0.16}
                />
                {/* curva */}
                <path
                  d={curvePath(selected.stabilityDays, w, h, padX, padY)}
                  fill="none"
                  stroke={selected.color}
                  strokeWidth={2}
                />
                {/* marcador do ponto de revisao */}
                {dipDay >= 0 ? (
                  <g>
                    <line
                      x1={padX + (dipDay / HORIZON) * (w - padX * 2)}
                      x2={padX + (dipDay / HORIZON) * (w - padX * 2)}
                      y1={padY}
                      y2={h - padY}
                      stroke="#F2762E"
                      strokeWidth={1}
                    />
                    <circle
                      cx={padX + (dipDay / HORIZON) * (w - padX * 2)}
                      cy={padY + (1 - TARGET) * (h - padY * 2)}
                      r={3.5}
                      fill="#F2762E"
                    />
                  </g>
                ) : null}
                {/* eixo x */}
                {[0, 10, 20, 30].map((d) => (
                  <text
                    key={d}
                    x={padX + (d / HORIZON) * (w - padX * 2)}
                    y={h - 4}
                    fontSize="9"
                    textAnchor="middle"
                    className="fill-slate-muted"
                  >
                    {d}d
                  </text>
                ))}
              </svg>
              <p className="mt-1 text-sm text-slate-soft">
                <span className="font-medium text-paper">{selected.name}</span> mantem 90% de
                retencao por{" "}
                <span className="text-action">
                  {dipDay >= 0 ? `~${dipDay} dias` : "mais de 30 dias"}
                </span>
                . Agende a revisao antes disso.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-muted">Sem dados de retencao ainda.</p>
          )}
        </div>

        {/* Ranking: categorias mais fragis primeiro */}
        <div>
          <p className="mb-2 text-2xs uppercase tracking-wider text-slate-muted">
            Onde voce mais erra
          </p>
          <ul className="space-y-1.5">
            {ranked.slice(0, 6).map((cat) => {
              const pct = Math.round(cat.accuracy * 100);
              const isSelected = cat.categoryId === selected?.categoryId;
              return (
                <li key={cat.categoryId ?? "none"}>
                  <button
                    onClick={() => setSelectedId(cat.categoryId)}
                    className={`flex w-full items-center gap-3 rounded-sm border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "border-focus bg-ink-600"
                        : "border-transparent hover:bg-ink-600/60"
                    }`}
                  >
                    <span
                      className="h-8 w-1 shrink-0"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-paper">{cat.name}</span>
                      <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-sm bg-ink-800">
                        <span
                          className="block h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct < 70 ? "#C25A54" : cat.color,
                          }}
                        />
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-paper">
                        {pct < 70 ? (
                          <IconArrowDownRight className="h-4 w-4 text-bad" title="Baixa retencao" />
                        ) : null}
                        {pct}%
                      </span>
                      <span className="text-2xs text-slate-muted">
                        revisar em {cat.daysToReview}d
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
