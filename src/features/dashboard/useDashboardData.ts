/**
 * Busca e agrega os dados do dashboard a partir das views de BI do Supabase.
 * As views usam security_invoker => a RLS ja garante que so vem dado do usuario. (#7, #17)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { daysUntilRetention } from "@/lib/srs";
import type {
  CategoryRetention,
  DashboardData,
  DayActivity,
} from "./dashboard.types";

type Status = "loading" | "ready" | "error";

/** Deriva estabilidade (dias) a partir da acuracia observada. Heuristica sobria. */
function stabilityFromAccuracy(accuracy: number, volume: number): number {
  // Mais acerto e mais volume => memoria mais estavel. Faixa ~1..60 dias.
  const base = Math.max(0.01, accuracy);
  const confidence = Math.min(1, volume / 40);
  return Math.round(1 + 59 * base * confidence);
}

function computeStreaks(activity: DayActivity[]): { current: number; longest: number } {
  const active = new Set(activity.filter((a) => a.reviews > 0).map((a) => a.day));
  const toKey = (d: Date) => d.toISOString().slice(0, 10);

  // streak atual: conta para tras a partir de hoje (ou ontem, se hoje ainda vazio).
  let current = 0;
  const cursor = new Date();
  if (!active.has(toKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (active.has(toKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // maior streak historico
  const days = [...active].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of days) {
    const d = new Date(key);
    if (prev && (d.getTime() - prev.getTime()) / 86400000 === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest };
}

export function useDashboardData() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    const since = new Date();
    since.setDate(since.getDate() - 364);
    const sinceStr = since.toISOString().slice(0, 10);

    const [activityRes, retentionRes] = await Promise.all([
      withJwtRetry(() =>
        supabase
          .from("v_daily_activity")
          .select("day, reviews, correct")
          .gte("day", sinceStr)
          .order("day", { ascending: true })
          .returns<{ day: string; reviews: number; correct: number }[]>(),
      ),
      withJwtRetry(() =>
        supabase
          .from("v_retention_by_category")
          .select("category_id, category_name, category_color, total_reviews, correct_reviews, accuracy")
          .order("total_reviews", { ascending: false })
          .returns<
            {
              category_id: string | null;
              category_name: string;
              category_color: string;
              total_reviews: number;
              correct_reviews: number;
              accuracy: number;
            }[]
          >(),
      ),
    ]);

    if (!mounted.current) return;

    if (activityRes.error || retentionRes.error) {
      setError(activityRes.error?.message ?? retentionRes.error?.message ?? "Erro ao carregar");
      setStatus("error");
      return;
    }

    const activity: DayActivity[] = (activityRes.data ?? []).map((r) => ({
      day: r.day,
      reviews: r.reviews,
      correct: r.correct,
    }));

    const retention: CategoryRetention[] = (retentionRes.data ?? []).map((r) => {
      const accuracy = Number(r.accuracy ?? 0);
      const stabilityDays = stabilityFromAccuracy(accuracy, r.total_reviews);
      return {
        categoryId: r.category_id,
        name: r.category_name,
        color: r.category_color,
        totalReviews: r.total_reviews,
        correctReviews: r.correct_reviews,
        accuracy,
        stabilityDays,
        daysToReview: daysUntilRetention(stabilityDays, 0.9),
      };
    });

    const { current, longest } = computeStreaks(activity);
    const reviewsLast30 = activity
      .filter((a) => (Date.now() - new Date(a.day).getTime()) / 86400000 <= 30)
      .reduce((sum, a) => sum + a.reviews, 0);
    const totals = retention.reduce(
      (acc, r) => ({ total: acc.total + r.totalReviews, correct: acc.correct + r.correctReviews }),
      { total: 0, correct: 0 },
    );

    setData({
      activity,
      retention,
      currentStreak: current,
      longestStreak: longest,
      reviewsLast30,
      overallAccuracy: totals.total ? totals.correct / totals.total : 0,
    });
    setStatus("ready");
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  return { status, data, error, reload: load };
}
