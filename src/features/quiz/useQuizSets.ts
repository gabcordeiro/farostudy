/**
 * Baterias de quiz salvas por trilha: permite refazer sem gastar uma nova
 * chamada de IA. RLS garante que cada usuário só ve as próprias.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { useAuth } from "@/features/auth/AuthProvider";
import type { QuizItem } from "./generateQuiz";

export interface QuizSet {
  id: string;
  deckId: string;
  items: QuizItem[];
  itemCount: number;
  createdAt: string;
}

const LIST_LIMIT = 10;

export function useQuizSets(deckId?: string) {
  const { user } = useAuth();
  const [sets, setSets] = useState<QuizSet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!deckId) {
      setSets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await withJwtRetry(() =>
      supabase
        .from("quiz_sets")
        .select("id, deck_id, items, item_count, created_at")
        .eq("deck_id", deckId)
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT)
        .returns<
          { id: string; deck_id: string; items: QuizItem[]; item_count: number; created_at: string }[]
        >(),
    );
    if (!res.error && res.data) {
      setSets(
        res.data.map((r) => ({
          id: r.id,
          deckId: r.deck_id,
          items: r.items,
          itemCount: r.item_count,
          createdAt: r.created_at,
        })),
      );
    }
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (targetDeckId: string, items: QuizItem[]): Promise<void> => {
      if (!user || items.length === 0) return;
      await withJwtRetry(() =>
        supabase.from("quiz_sets").insert({ user_id: user.id, deck_id: targetDeckId, items }),
      );
      if (targetDeckId === deckId) void load();
    },
    [user, deckId, load],
  );

  return { sets, loading, reload: load, save };
}
