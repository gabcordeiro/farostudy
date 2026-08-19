/**
 * Fila de revisão: cards vencidos (due_at <= now) do usuário, com o
 * category_id do deck já resolvido para gravar no reviews.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import type { CardState } from "@/lib/database.types";

export interface StudyCardRow {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  hint: string | null;
  state: CardState;
  interval_days: number;
  ease_factor: number;
  reps: number;
  lapses: number;
  category_id: string | null;
  deck_title: string;
}

interface JoinedRow {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  hint: string | null;
  state: CardState;
  interval_days: number;
  ease_factor: number;
  reps: number;
  lapses: number;
  decks: { title: string; category_id: string | null } | null;
}

const QUEUE_LIMIT = 50;

export function useStudyQueue(deckId?: string) {
  const [queue, setQueue] = useState<StudyCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const nowIso = new Date().toISOString();

    const res = await withJwtRetry(() => {
      const base = supabase
        .from("cards")
        .select(
          "id, deck_id, front, back, hint, state, interval_days, ease_factor, reps, lapses, decks:deck_id ( title, category_id )",
        )
        .lte("due_at", nowIso)
        .neq("state", "suspended");
      const filtered = deckId ? base.eq("deck_id", deckId) : base;
      return filtered
        .order("due_at", { ascending: true })
        .limit(QUEUE_LIMIT)
        .returns<JoinedRow[]>();
    });

    if (res.error) {
      setError(res.error.message ?? "Erro ao carregar cards");
      setQueue([]);
    } else {
      const rows = (res.data ?? []).map<StudyCardRow>((r) => ({
        id: r.id,
        deck_id: r.deck_id,
        front: r.front,
        back: r.back,
        hint: r.hint,
        state: r.state,
        interval_days: Number(r.interval_days),
        ease_factor: Number(r.ease_factor),
        reps: r.reps,
        lapses: r.lapses,
        category_id: r.decks?.category_id ?? null,
        deck_title: r.decks?.title ?? "",
      }));
      setQueue(rows);
    }
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { queue, loading, error, reload: load, setQueue };
}
