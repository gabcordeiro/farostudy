/**
 * Dashboard - BI de Evolução.
 * Compoe Heatmap de Consistência + BI de Retenção (curva de esquecimento).
 * Estados: skeleton (nunca spinner), erro, vazio (com mascote), pronto.
 */
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { IconChart, IconFlame, IconLayers, IconRoute, IconTarget } from "@/components/icons";
import { ConsistencyHeatmap } from "./ConsistencyHeatmap";
import { RetentionBI } from "./RetentionBI";
import { WeeklyProgress } from "./WeeklyProgress";
import { DailyGoalCard } from "./DailyGoalCard";
import { ResumeSection } from "./ResumeSection";
import { useDashboardData } from "./useDashboardData";
import { useProfile } from "@/features/profile/useProfile";
import { useCountUp } from "@/lib/useCountUp";
import type { ReactNode } from "react";

/** Chave de dia local (meia-noite local -> data), igual ao heatmap/WeeklyProgress. */
function localDayKey(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

type Tone = "focus" | "good" | "action" | "cool";

const TONE_CHIP: Record<Tone, string> = {
  focus: "bg-focus/15 text-focus-soft",
  good: "bg-good/15 text-good",
  action: "bg-action/15 text-action",
  cool: "bg-focus-soft/15 text-focus-soft",
};

function StatTile({
  icon,
  tone = "focus",
  label,
  value,
  suffix,
  hint,
  delayMs = 0,
}: {
  icon: ReactNode;
  tone?: Tone;
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  delayMs?: number;
}) {
  const count = useCountUp(value);
  return (
    <div
      className="animate-rise-in rounded-md border border-slate-border bg-ink-700 p-4 transition-transform duration-200 ease-fluid hover:-translate-y-0.5"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TONE_CHIP[tone]}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl text-paper tabular-nums">
            {count}
            {suffix}
          </p>
          <p className="text-2xs uppercase tracking-wider text-slate-muted">{label}</p>
          {hint ? <p className="text-2xs text-slate-muted">{hint}</p> : null}
        </div>
      </div>
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
  const { profile } = useProfile();

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
                icon={<IconFlame className="h-5 w-5" />}
                tone="action"
                label="Sequência atual"
                value={data.currentStreak}
                suffix=" dias"
                hint={`melhor: ${data.longestStreak} dias`}
                delayMs={0}
              />
              <StatTile
                icon={<IconLayers className="h-5 w-5" />}
                tone="focus"
                label="Revisões 30d"
                value={data.reviewsLast30}
                delayMs={60}
              />
              <StatTile
                icon={<IconTarget className="h-5 w-5" />}
                tone="good"
                label="Acerto geral"
                value={Math.round(data.overallAccuracy * 100)}
                suffix="%"
                delayMs={120}
              />
              <StatTile
                icon={<IconRoute className="h-5 w-5" />}
                tone="cool"
                label="Trilhas ativas"
                value={data.retention.length}
                delayMs={180}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="animate-rise-in lg:col-span-2" style={{ animationDelay: "200ms" }}>
                <WeeklyProgress activity={data.activity} />
              </div>
              <div className="animate-rise-in" style={{ animationDelay: "240ms" }}>
                <DailyGoalCard
                  reviewedToday={
                    data.activity.find((a) => a.day === localDayKey(new Date()))?.reviews ?? 0
                  }
                  goal={profile?.daily_goal ?? 20}
                />
              </div>
            </div>

            <div className="animate-rise-in" style={{ animationDelay: "260ms" }}>
              <ResumeSection />
            </div>

            <div className="animate-rise-in" style={{ animationDelay: "280ms" }}>
              <ConsistencyHeatmap
                activity={data.activity}
                currentStreak={data.currentStreak}
                longestStreak={data.longestStreak}
              />
            </div>

            <div className="animate-rise-in" style={{ animationDelay: "360ms" }}>
              <RetentionBI retention={data.retention} overallAccuracy={data.overallAccuracy} />
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
