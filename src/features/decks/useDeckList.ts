/**
 * Lista de trilhas com contagem de cards, para a pagina /trilhas.
 * RLS garante que so vem trilha do proprio usuario.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { useAuth } from "@/features/auth/AuthProvider";

export interface DeckSummary {
  id: string;
  title: string;
  description: string | null;
  cardCount: number;
  createdAt: string;
}

interface DeckWithCount {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  cards: { count: number }[] | null;
}

export function useDeckList() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await withJwtRetry(() =>
      supabase
        .from("decks")
        .select("id, title, description, created_at, cards(count)")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .returns<DeckWithCount[]>(),
    );
    if (res.error) setError(res.error.message ?? "Erro ao carregar trilhas");
    else {
      setDecks(
        (res.data ?? []).map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          cardCount: d.cards?.[0]?.count ?? 0,
          createdAt: d.created_at,
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (title: string): Promise<DeckSummary | null> => {
      if (!user) return null;
      const res = await withJwtRetry(() =>
        supabase
          .from("decks")
          .insert({ user_id: user.id, title: title.trim() })
          .select("id, title, description, created_at")
          .single(),
      );
      if (res.error || !res.data) {
        setError(res.error?.message ?? "Falha ao criar trilha");
        return null;
      }
      const created: DeckSummary = {
        id: res.data.id,
        title: res.data.title,
        description: res.data.description,
        cardCount: 0,
        createdAt: res.data.created_at,
      };
      setDecks((prev) => [created, ...prev]);
      return created;
    },
    [user],
  );

  const rename = useCallback(async (id: string, title: string): Promise<boolean> => {
    const res = await withJwtRetry(() => supabase.from("decks").update({ title: title.trim() }).eq("id", id));
    if (res.error) {
      setError(res.error.message ?? "Falha ao renomear");
      return false;
    }
    setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, title: title.trim() } : d)));
    return true;
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const res = await withJwtRetry(() => supabase.from("decks").delete().eq("id", id));
    if (res.error) {
      setError(res.error.message ?? "Falha ao excluir");
      return false;
    }
    setDecks((prev) => prev.filter((d) => d.id !== id));
    return true;
  }, []);

  return { decks, loading, error, reload: load, create, rename, remove };
}
