/**
 * Tipos do banco (subset). Em producao gerar com:
 *   supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 * Mantido a mao aqui para o scaffold compilar sem a CLI.
 */
export type CardState = "new" | "learning" | "review" | "relearning" | "suspended";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          locale: string;
          timezone: string;
          accepted_tos_at: string | null;
          accepted_privacy_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; name: string; color?: string; position?: number };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      decks: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          title: string;
          description: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; title: string; category_id?: string | null; description?: string | null };
        Update: Partial<Database["public"]["Tables"]["decks"]["Row"]>;
        Relationships: [];
      };
      cards: {
        Row: {
          id: string;
          user_id: string;
          deck_id: string;
          front: string;
          back: string;
          hint: string | null;
          tags: string[];
          source: string;
          state: CardState;
          due_at: string;
          interval_days: number;
          ease_factor: number;
          reps: number;
          lapses: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          deck_id: string;
          front: string;
          back: string;
          hint?: string | null;
          tags?: string[];
          source?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cards"]["Row"]>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          deck_id: string;
          category_id: string | null;
          rating: number;
          is_correct: boolean;
          duration_ms: number | null;
          prev_interval: number | null;
          next_interval: number | null;
          reviewed_at: string;
          reviewed_on: string;
        };
        Insert: {
          user_id: string;
          card_id: string;
          deck_id: string;
          category_id?: string | null;
          rating: number;
          duration_ms?: number | null;
          prev_interval?: number | null;
          next_interval?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Row"]>;
        Relationships: [];
      };
      quiz_sets: {
        Row: {
          id: string;
          user_id: string;
          deck_id: string;
          items: unknown;
          item_count: number;
          created_at: string;
        };
        Insert: { user_id: string; deck_id: string; items: unknown };
        Update: Partial<Database["public"]["Tables"]["quiz_sets"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      v_daily_activity: {
        Row: { user_id: string; day: string; reviews: number; correct: number };
        Relationships: [];
      };
      v_retention_by_category: {
        Row: {
          user_id: string;
          category_id: string | null;
          category_name: string;
          category_color: string;
          total_reviews: number;
          correct_reviews: number;
          accuracy: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: { card_state: CardState };
  };
}
