/**
 * O SDK do supabase-js só expoe uma mensagem generica em `error.message`
 * ("Edge Function returned a non-2xx status code") quando uma edge function
 * responde com status != 2xx. O corpo real (nosso {error, detail}) fica em
 * `error.context` (a Response crua). Este helper le esse corpo com segurança.
 */
export interface FunctionErrorInfo {
  message: string;
  status?: number;
  insufficientCredits: boolean;
}

interface FunctionsErrorLike {
  message?: string;
  context?: Response;
}

/** Erro com o motivo real já extraido do corpo da resposta da edge function. */
export class AppFunctionError extends Error {
  insufficientCredits: boolean;
  status?: number;

  constructor(info: FunctionErrorInfo) {
    super(info.message);
    this.name = "AppFunctionError";
    this.insufficientCredits = info.insufficientCredits;
    this.status = info.status;
  }
}

export async function describeFunctionError(error: unknown): Promise<FunctionErrorInfo> {
  const err = error as FunctionsErrorLike;
  const status = err?.context?.status;
  let message = err?.message ?? "Falha na requisicao.";

  if (err?.context && typeof err.context.json === "function") {
    try {
      const body = (await err.context.json()) as { error?: string; detail?: string };
      message = body.detail || body.error || message;
    } catch {
      // corpo não era JSON válido; mantém a mensagem generica
    }
  }

  return { message, status, insufficientCredits: status === 402 };
}
