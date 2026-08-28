/**
 * Planos de crédito públicos. A compra em si é via Mercado Pago
 * (startCheckout.ts); casos especiais/problema no pagamento vão por
 * contato direto (ver PlansPage.tsx) e o admin concede crédito na mão.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface CreditPlan {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
}

export function usePlans() {
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const plansRes = await supabase
      .from("credit_plans")
      .select("id, name, credits, price_cents")
      .eq("is_active", true)
      .order("position", { ascending: true });

    if (!plansRes.error) {
      setPlans(
        (plansRes.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          credits: p.credits,
          priceCents: p.price_cents,
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { plans, loading, reload: load };
}
