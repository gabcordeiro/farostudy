/**
 * Invoca a edge function `generate-cards`. O SDK anexa o JWT do usuario,
 * entao a chave do Gemini nunca toca o browser.
 */
import { supabase } from "@/lib/supabase";
import { aiGenerateSchema, type AiGenerateInput } from "@/lib/validation";
import { AppFunctionError, describeFunctionError } from "@/lib/functionError";

export interface GenerateResult {
  created: number;
  cards: { id: string; front: string; back: string }[];
}

export async function generateCards(input: AiGenerateInput): Promise<GenerateResult> {
  const payload = aiGenerateSchema.parse(input); // valida antes de enviar (#14)
  const { data, error } = await supabase.functions.invoke<GenerateResult>("generate-cards", {
    body: payload,
  });
  if (error) throw new AppFunctionError(await describeFunctionError(error));
  if (!data) throw new Error("Resposta vazia da funcao");
  return data;
}
