/**
 * Eventos do calendário do usuário (alerta de prova etc.). RLS limita ao dono.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { useAuth } from "@/features/auth/AuthProvider";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  kind: "exam" | "custom";
  deckId: string | null;
}

export function useCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await withJwtRetry(() =>
      supabase
        .from("calendar_events")
        .select("id, title, event_date, kind, deck_id")
        .order("event_date", { ascending: true })
        .returns<{ id: string; title: string; event_date: string; kind: "exam" | "custom"; deck_id: string | null }[]>(),
    );
    if (!res.error) {
      setEvents(
        (res.data ?? []).map((e) => ({
          id: e.id,
          title: e.title,
          date: e.event_date,
          kind: e.kind,
          deckId: e.deck_id,
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(
    async (input: { title: string; date: string; kind: "exam" | "custom"; deckId?: string | null }): Promise<boolean> => {
      if (!user) return false;
      const res = await withJwtRetry(() =>
        supabase
          .from("calendar_events")
          .insert({
            user_id: user.id,
            title: input.title.trim(),
            event_date: input.date,
            kind: input.kind,
            deck_id: input.deckId ?? null,
          })
          .select("id, title, event_date, kind, deck_id")
          .single(),
      );
      if (res.error || !res.data) return false;
      const e = res.data;
      setEvents((prev) =>
        [...prev, { id: e.id, title: e.title, date: e.event_date, kind: e.kind, deckId: e.deck_id }].sort(
          (a, b) => a.date.localeCompare(b.date),
        ),
      );
      return true;
    },
    [user],
  );

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const res = await withJwtRetry(() => supabase.from("calendar_events").delete().eq("id", id));
    if (res.error) return false;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    return true;
  }, []);

  return { events, loading, add, remove };
}
