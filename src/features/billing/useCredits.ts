/**
 * Saldo de créditos do usuário logado (v_credit_balance, RLS por dono).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { useAuth } from "@/features/auth/AuthProvider";

export function useCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const res = await withJwtRetry(() =>
      supabase.from("v_credit_balance").select("balance").eq("user_id", user.id).maybeSingle(),
    );
    setBalance(res.error ? 0 : (res.data?.balance ?? 0));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { balance, loading, reload: load };
}
