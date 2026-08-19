/**
 * Helper para queries que podem falhar por clock skew ("JWT issued at future").
 * Estratégia: executa; se o erro indicar problema de iat/exp, força
 * refreshSession() para obter token novo e reexecuta uma vez.
 */
import { supabase } from "./supabase";

interface QueryError {
  message?: string | null;
  code?: string | null;
}

interface QueryResult<T> {
  data: T;
  error: QueryError | null;
}

const JWT_CLOCK_MARKERS = [
  "jwt issued at future",
  "invalid iat",
  "invalid_iat",
  "jwt expired",
  "pgrst301",
];

function isClockSkewError(res: { error: QueryError | null }): boolean {
  const err = res.error;
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  const code = (err.code ?? "").toLowerCase();
  return JWT_CLOCK_MARKERS.some((m) => msg.includes(m) || code.includes(m));
}

/**
 * Executa `run()`; se o resultado carrega um erro de clock/JWT, tenta um
 * refresh e reexecuta. Retorna o próximo resultado (sucesso ou erro final).
 *
 * Aceita PromiseLike (Supabase builders são thenables, não Promise "puros").
 */
export async function withJwtRetry<T>(
  run: () => PromiseLike<QueryResult<T>>,
): Promise<QueryResult<T>> {
  const first: QueryResult<T> = await run();
  if (!isClockSkewError(first)) return first;

  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) return first;

  const second: QueryResult<T> = await run();
  if (isClockSkewError(second)) {
    return {
      data: second.data,
      error: {
        ...(second.error ?? {}),
        message:
          "Seu relógio parece estar dessincronizado. Verifique a hora do sistema e tente novamente.",
      },
    };
  }
  return second;
}
