/**
 * Planos de crédito públicos + solicitação de compra (fluxo manual: o admin
 * aprova em /admin até o gateway de pagamento de verdade ser plugado).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { useAuth } from "@/features/auth/AuthProvider";

export interface CreditPlan {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
}

export interface CreditRequestRow {
  id: string;
  planId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export function usePlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [requests, setRequests] = useState<CreditRequestRow[]>([]);
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

    if (user) {
      const reqRes = await withJwtRetry(() =>
        supabase
          .from("credit_requests")
          .select("id, plan_id, status, created_at")
          .order("created_at", { ascending: false })
          .returns<{ id: string; plan_id: string; status: "pending" | "approved" | "rejected"; created_at: string }[]>(),
      );
      if (!reqRes.error) {
        setRequests(
          (reqRes.data ?? []).map((r) => ({
            id: r.id,
            planId: r.plan_id,
            status: r.status,
            createdAt: r.created_at,
          })),
        );
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const requestPlan = useCallback(
    async (planId: string): Promise<boolean> => {
      if (!user) return false;
      const res = await withJwtRetry(() =>
        supabase.from("credit_requests").insert({ user_id: user.id, plan_id: planId }),
      );
      if (!res.error) void load();
      return !res.error;
    },
    [user, load],
  );

  return { plans, requests, loading, reload: load, requestPlan };
}
