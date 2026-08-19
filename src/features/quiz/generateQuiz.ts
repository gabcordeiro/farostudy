import { supabase } from "@/lib/supabase";

export interface QuizChoice {
  text: string;
  isCorrect: boolean;
}
export interface QuizItem {
  cardId: string;
  front: string;
  choices: QuizChoice[];
}
export interface QuizResult {
  items: QuizItem[];
}

export async function generateQuiz(input: { deckId: string; count?: number }): Promise<QuizResult> {
  const { data, error } = await supabase.functions.invoke<QuizResult>("generate-quiz", {
    body: input,
  });
  if (error) throw error;
  if (!data) throw new Error("Resposta vazia do quiz");
  return data;
}
