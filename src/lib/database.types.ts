/**
 * Tipos do banco (subset). Em produção gerar com:
 *   supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 * Mantido à mão aqui para o scaffold compilar sem a CLI.
 */
export type CardState = "new" | "learning" | "review" | "relearning" | "suspended";
export type UserRole = "user" | "admin";
export type CreditRequestStatus = "pending" | "approved" | "rejected";

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
          role: UserRole;
          onboarded_at: string | null;
          accepted_tos_at: string | null;
          accepted_privacy_at: string | null;
          daily_goal: number;
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
      credit_plans: {
        Row: {
          id: string;
          name: string;
          credits: number;
          price_cents: number;
          is_active: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          credits: number;
          price_cents: number;
          is_active?: boolean;
          position?: number;
        };
        Update: Partial<Database["public"]["Tables"]["credit_plans"]["Row"]>;
        Relationships: [];
      };
      credit_ledger: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      credit_requests: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: CreditRequestStatus;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: { user_id: string; plan_id: string; status?: "pending" };
        Update: never;
        Relationships: [];
      };
      error_logs: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          status_code: number;
          message: string;
          created_at: string;
        };
        Insert: { user_id: string; source: string; status_code: number; message: string };
        Update: never;
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: number;
          appearance: unknown;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: { id?: number; appearance?: unknown };
        Update: { appearance?: unknown };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          event_date: string;
          kind: "exam" | "custom";
          deck_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          event_date: string;
          kind?: "exam" | "custom";
          deck_id?: string | null;
        };
        Update: { title?: string; event_date?: string; kind?: "exam" | "custom"; deck_id?: string | null };
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
      v_credit_balance: {
        Row: { user_id: string; balance: number };
        Relationships: [];
      };
    };
    Functions: {
      grant_credits: {
        Args: { target_user: string; amount: number; reason: string };
        Returns: number;
      };
      consume_credits: {
        Args: { amount: number; reason: string };
        Returns: number;
      };
      refund_credits: {
        Args: { amount: number; reason: string };
        Returns: number;
      };
      set_user_role: {
        Args: { target_user: string; new_role: UserRole };
        Returns: void;
      };
      resolve_credit_request: {
        Args: { request_id: string; approve: boolean };
        Returns: void;
      };
      set_app_appearance: {
        Args: { p_appearance: Record<string, unknown> };
        Returns: void;
      };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          balance: number;
          created_at: string;
        }[];
      };
    };
    Enums: { card_state: CardState };
  };
}
