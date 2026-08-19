import { createClient } from "@supabase/supabase-js";
import { env } from "./env";
import type { Database } from "./database.types";

/**
 * Cliente Supabase para o browser.
 * - Usa apenas a ANON KEY (publica). Toda a autorizacao vem da RLS. (#3, #4)
 * - Sessao persistida em cookie/localStorage seguro pelo proprio SDK. (#9)
 * - Queries sao parametrizadas pelo SDK -> sem SQL injection. (#13)
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  },
);
