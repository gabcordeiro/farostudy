import { supabase } from "@/lib/supabase";
import { AppFunctionError, describeFunctionError } from "@/lib/functionError";

export interface ScheduleSession {
  date: string; // YYYY-MM-DD
  title: string;
}
export interface ScheduleResult {
  sessions: ScheduleSession[];
  deckTitle: string;
  examDate: string;
}

export async function generateSchedule(input: { deckId: string; examDate: string }): Promise<ScheduleResult> {
  const { data, error } = await supabase.functions.invoke<ScheduleResult>("generate-schedule", {
    body: input,
  });
  if (error) throw new AppFunctionError(await describeFunctionError(error));
  if (!data) throw new Error("Resposta vazia do cronograma");
  return data;
}
