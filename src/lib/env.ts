/**
 * Leitura validada das variaveis de ambiente publicas.
 * Somente chaves com prefixo VITE_ chegam ao browser (checklist seguranca #1, #3).
 * Falha cedo e de forma clara se algo faltar.
 */
import { z } from "zod";

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  VITE_ANALYTICS_ID: z.string().optional().default(""),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  // Nao vaza valores, apenas quais chaves faltam.
  const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(
    `Configuracao de ambiente invalida. Verifique seu .env.local: ${missing}`,
  );
}

export const env = parsed.data;
