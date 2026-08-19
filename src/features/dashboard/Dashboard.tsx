/**
 * Dashboard - BI de Evolução.
 * Compoe Heatmap de Consistência + BI de Retenção (curva de esquecimento).
 * Estados: skeleton (nunca spinner), erro, vazio (com mascote), pronto.
 */
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { IconChart, IconLayers, IconRoute } from "@/components/icons";
import { ConsistencyHeatmap } from "./ConsistencyHeatmap";
import { RetentionBI } from "./RetentionBI";
import { useDashboardData } from "./useDashboardData";
import type { ReactNode } from "react";

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-slate-border bg-ink-700 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-muted">
        {icon}
        <span className="text-2xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-2xl text-paper tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-2xs text-slate-muted">{hint}</p> : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-slate-border bg-ink-700 p-4">
            <Skeleton className="mb-3 h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-md border border-slate-border bg-ink-700 p-5">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="rounded-md border border-slate-border bg-ink-700 p-5">
        <Skeleton className="mb-4 h-4 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { status, data, error, reload } = useDashboardData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <SEO
        title="Painel de evolução"
        description="Acompanhe sua ofensiva de estudos e a curva de retenção por trilha no Faro Study."
        path="/painel"
        noindex
      />

      <header className="mb-6 flex items-center gap-3">
        <IconChart className="h-6 w-6 text-focus-soft" title="Painel" />
        <div>
          <h1 className="font-display text-2xl text-paper">Sua evolução</h1>
          <p className="text-sm text-slate-muted">
            Consistência diária e retenção por trilha de estudo.
          </p>
        </div>
      </header>

      {status === "loading" ? <DashboardSkeleton /> : null}

      {status === "error" ? (
        <div className="rounded-md border border-bad/40 bg-ink-700 p-6 text-center">
          <p className="text-sm text-slate-soft">Não foi possível carregar seu painel.</p>
          <p className="mt-1 text-2xs text-slate-muted">{error}</p>
          <button
            onClick={() => void reload()}
            className="mt-4 rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {status === "ready" && data ? (
        data.retention.length === 0 && data.reviewsLast30 === 0 ? (
          <EmptyState
            mood="search"
            title="Ainda não ha o que medir"
            description="Gere seus primeiros cards e revise alguns: o Faro começa a mapear sua consistência e sua curva de retenção aqui."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  to="/importar"
                  className="inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
                >
                  Gerar meus cards
                </Link>
                <Link
                  to="/ajuda"
                  className="inline-block rounded-sm border border-hairline px-4 py-2 text-sm text-paper hover:border-focus"
                >
                  Como funciona
                </Link>
              </div>
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile
                icon={<IconRoute className="h-4 w-4" />}
                label="Ofensiva"
                value={`${data.currentStreak}d`}
                hint={`recorde ${data.longestStreak}d`}
              />
              <StatTile
                icon={<IconLayers className="h-4 w-4" />}
                label="Revisões 30d"
                value={String(data.reviewsLast30)}
              />
              <StatTile
                icon={<IconChart className="h-4 w-4" />}
                label="Acerto geral"
                value={`${Math.round(data.overallAccuracy * 100)}%`}
              />
              <StatTile
                icon={<IconRoute className="h-4 w-4" />}
                label="Trilhas ativas"
                value={String(data.retention.length)}
              />
            </div>

            <ConsistencyHeatmap
              activity={data.activity}
              currentStreak={data.currentStreak}
              longestStreak={data.longestStreak}
            />

            <RetentionBI retention={data.retention} overallAccuracy={data.overallAccuracy} />
          </div>
        )
      ) : null}
    </div>
  );
}
