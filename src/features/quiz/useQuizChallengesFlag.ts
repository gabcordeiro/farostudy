/**
 * Interruptor do quiz competitivo (admin liga/desliga em /admin > Recursos).
 * Linha única em app_settings, legível por todo mundo (mesma tabela usada
 * pela aparência global).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** `null` enquanto ainda não sabe -- evita mostrar "desativado" por um
 * instante antes da consulta responder. */
export function useQuizChallengesEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void supabase
      .from("app_settings")
      .select("quiz_challenges_enabled")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setEnabled(data?.quiz_challenges_enabled ?? false);
      });
    return () => {
      active = false;
    };
  }, []);

  return enabled;
}
