/**
 * Detalhe de uma trilha: dados do deck + seus cards, com edicao/exclusao.
 * RLS trava tudo em auth.uid() = user_id; o trigger de cards confere que o
 * deck_id continua pertencendo ao usuario em qualquer update.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import type { CardState } from "@/lib/database.types";

export interface DeckCardRow {
  id: string;
  front: string;
  back: string;
  hint: string | null;
  tags: string[];
  state: CardState;
  due_at: string;
}

export interface CardEdit {
  front: string;
  back: string;
  hint?: string | null;
}

export function useDeckDetail(deckId: string | undefined) {
  const [title, setTitle] = useState<string>("");
  const [cards, setCards] = useState<DeckCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    const [deckRes, cardsRes] = await Promise.all([
      withJwtRetry(() => supabase.from("decks").select("title").eq("id", deckId).maybeSingle()),
      withJwtRetry(() =>
        supabase
          .from("cards")
          .select("id, front, back, hint, tags, state, due_at")
          .eq("deck_id", deckId)
          .order("created_at", { ascending: false })
          .returns<DeckCardRow[]>(),
      ),
    ]);

    if (deckRes.error) {
      setError(deckRes.error.message ?? "Erro ao carregar trilha");
      setLoading(false);
      return;
    }
    if (!deckRes.data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setTitle(deckRes.data.title);

    if (cardsRes.error) setError(cardsRes.error.message ?? "Erro ao carregar cards");
    else setCards(cardsRes.data ?? []);

    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    void load();
  }, [load]);

  const renameDeck = useCallback(
    async (newTitle: string): Promise<boolean> => {
      if (!deckId) return false;
      const res = await withJwtRetry(() =>
        supabase.from("decks").update({ title: newTitle.trim() }).eq("id", deckId),
      );
      if (res.error) {
        setError(res.error.message ?? "Falha ao renomear");
        return false;
      }
      setTitle(newTitle.trim());
      return true;
    },
    [deckId],
  );

  const updateCard = useCallback(async (cardId: string, patch: CardEdit): Promise<boolean> => {
    const res = await withJwtRetry(() =>
      supabase
        .from("cards")
        .update({ front: patch.front, back: patch.back, hint: patch.hint ?? null })
        .eq("id", cardId),
    );
    if (res.error) {
      setError(res.error.message ?? "Falha ao salvar card");
      return false;
    }
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, front: patch.front, back: patch.back, hint: patch.hint ?? null } : c)),
    );
    return true;
  }, []);

  const deleteCard = useCallback(async (cardId: string): Promise<boolean> => {
    const res = await withJwtRetry(() => supabase.from("cards").delete().eq("id", cardId));
    if (res.error) {
      setError(res.error.message ?? "Falha ao excluir card");
      return false;
    }
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    return true;
  }, []);

  return { title, cards, loading, error, notFound, reload: load, renameDeck, updateCard, deleteCard };
}
