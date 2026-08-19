/**
 * Lista e cria decks (trilhas) do usuário. RLS garante o escopo por dono.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { useAuth } from "@/features/auth/AuthProvider";

export interface DeckOption {
  id: string;
  title: string;
}

export function useDecks() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("decks")
      .select("id, title")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setDecks(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createDeck = useCallback(
    async (title: string): Promise<DeckOption | null> => {
      if (!user) return null;
      const payload: Database["public"]["Tables"]["decks"]["Insert"] = {
        user_id: user.id,
        title: title.trim(),
      };
      const { data, error } = await supabase
        .from("decks")
        .insert(payload)
        .select("id, title")
        .single();
      if (error) {
        setError(error.message);
        return null;
      }
      setDecks((prev) => [data, ...prev]);
      return data;
    },
    [user],
  );

  return { decks, loading, error, reload: load, createDeck };
}
