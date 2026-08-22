// Grava o detalhe tecnico de uma falha em public.error_logs e devolve um
// "codigo" curto (8 chars do id) para mostrar ao cliente -- ele nao ve o
// erro cru (ex.: resposta do Gemini), so esse codigo, que o admin usa em
// /admin para achar a linha completa.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function logError(
  supabase: SupabaseClient,
  userId: string,
  source: string,
  statusCode: number,
  message: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("error_logs")
    .insert({ user_id: userId, source, status_code: statusCode, message })
    .select("id")
    .single();
  if (error) {
    console.error("falha ao gravar error_logs", error);
    return null;
  }
  return (data.id as string).slice(0, 8).toUpperCase();
}
