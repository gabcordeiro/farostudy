/**
 * Trilhas para "Continue de onde parou": total de cards, quantos já foram
 * iniciados (não estão em 'new') e quantos estão vencidos para hoje. Agrega no
 * cliente a partir de uma única leitura de cards (RLS já limita ao usuário).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";

export interface ResumeDeck {
  id: string;
  title: string;
  total: number;
  studied: number;
  due: number;
}

export function useResumeDecks() {
  const [decks, setDecks] = useState<ResumeDeck[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    const [decksRes, cardsRes] = await Promise.all([
      withJwtRetry(() =>
        supabase
          .from("decks")
          .select("id, title")
          .eq("is_archived", false)
          .returns<{ id: string; title: string }[]>(),
      ),
      withJwtRetry(() =>
        supabase
          .from("cards")
          .select("deck_id, state, due_at")
          .neq("state", "suspended")
          .limit(5000)
          .returns<{ deck_id: string; state: string; due_at: string }[]>(),
      ),
    ]);

    if (decksRes.error || cardsRes.error) {
      setDecks([]);
      setLoading(false);
      return;
    }

    const agg = new Map<string, { total: number; studied: number; due: number }>();
    for (const c of cardsRes.data ?? []) {
      const a = agg.get(c.deck_id) ?? { total: 0, studied: 0, due: 0 };
      a.total += 1;
      if (c.state !== "new") a.studied += 1;
      if (c.due_at <= nowIso) a.due += 1;
      agg.set(c.deck_id, a);
    }

    const list: ResumeDeck[] = (decksRes.data ?? [])
      .map((d) => {
        const a = agg.get(d.id) ?? { total: 0, studied: 0, due: 0 };
        return { id: d.id, title: d.title, ...a };
      })
      .filter((d) => d.total > 0)
      // Prioriza quem tem cards vencidos; depois quem tem mais progresso.
      .sort((x, y) => y.due - x.due || y.studied - x.studied)
      .slice(0, 3);

    setDecks(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { decks, loading };
}
