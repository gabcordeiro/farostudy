import { supabase } from "@/lib/supabase";
import { AppFunctionError, describeFunctionError } from "@/lib/functionError";

export async function sendSuggestion(message: string): Promise<void> {
  const { error } = await supabase.functions.invoke("notify-suggestion", {
    body: { message },
  });
  if (error) throw new AppFunctionError(await describeFunctionError(error));
}
