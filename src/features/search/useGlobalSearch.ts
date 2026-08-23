/**
 * Busca global (trilhas + cards). Debounce curto; RLS limita ao usuário.
 * Sanitiza a query para os filtros do PostgREST (vírgula/parênteses são
 * sintaxe de `or`/filtro e quebrariam a consulta).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface SearchResults {
  decks: { id: string; title: string }[];
  cards: { id: string; front: string; deckId: string; deckTitle: string }[];
}

const EMPTY: SearchResults = { decks: [], cards: [] };

export function useGlobalSearch(query: string) {
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    const safe = q.replace(/[,()*%]/g, " ").trim();
    const like = `%${safe}%`;
    let cancelled = false;
    setLoading(true);

    const t = window.setTimeout(async () => {
      const [decksRes, cardsRes] = await Promise.all([
        supabase
          .from("decks")
          .select("id, title")
          .eq("is_archived", false)
          .ilike("title", like)
          .limit(6)
          .returns<{ id: string; title: string }[]>(),
        supabase
          .from("cards")
          .select("id, front, deck_id, decks(title)")
          .or(`front.ilike.${like},back.ilike.${like}`)
          .limit(8)
          .returns<{ id: string; front: string; deck_id: string; decks: { title: string } | null }[]>(),
      ]);
      if (cancelled) return;
      setResults({
        decks: decksRes.data ?? [],
        cards: (cardsRes.data ?? []).map((c) => ({
          id: c.id,
          front: c.front,
          deckId: c.deck_id,
          deckTitle: c.decks?.title ?? "",
        })),
      });
      setLoading(false);
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  return { results, loading };
}
