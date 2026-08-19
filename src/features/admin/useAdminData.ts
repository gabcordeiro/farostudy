/**
 * Dados do painel admin: usuarios (via RPC admin_list_users, ja que auth.users
 * nao e exposto por PostgREST), solicitacoes de credito e as acoes que so um
 * admin pode executar (todas via RPC security definer no banco).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import type { CreditRequestStatus, UserRole } from "@/lib/database.types";

export interface AdminUserRow {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  balance: number;
  createdAt: string;
}

export interface AdminPlanRow {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  isActive: boolean;
}

export interface AdminRequestRow {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  planCredits: number;
  status: CreditRequestStatus;
  createdAt: string;
}

interface RequestJoined {
  id: string;
  user_id: string;
  plan_id: string;
  status: CreditRequestStatus;
  created_at: string;
  credit_plans: { name: string; credits: number } | null;
}

export function useAdminData() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [requests, setRequests] = useState<AdminRequestRow[]>([]);
  const [plans, setPlans] = useState<AdminPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [usersRes, requestsRes, plansRes] = await Promise.all([
      withJwtRetry(() => supabase.rpc("admin_list_users")),
      withJwtRetry(() =>
        supabase
          .from("credit_requests")
          .select("id, user_id, plan_id, status, created_at, credit_plans(name, credits)")
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<RequestJoined[]>(),
      ),
      withJwtRetry(() =>
        supabase
          .from("credit_plans")
          .select("id, name, credits, price_cents, is_active")
          .order("position", { ascending: true }),
      ),
    ]);

    if (!plansRes.error) {
      setPlans(
        (plansRes.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          credits: p.credits,
          priceCents: p.price_cents,
          isActive: p.is_active,
        })),
      );
    }

    if (usersRes.error) setError(usersRes.error.message ?? "Erro ao carregar usuarios");
    else {
      setUsers(
        (usersRes.data ?? []).map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.display_name,
          avatarUrl: u.avatar_url,
          role: u.role,
          balance: u.balance,
          createdAt: u.created_at,
        })),
      );
    }

    if (!requestsRes.error) {
      setRequests(
        (requestsRes.data ?? []).map((r) => ({
          id: r.id,
          userId: r.user_id,
          planId: r.plan_id,
          planName: r.credit_plans?.name ?? "Plano removido",
          planCredits: r.credit_plans?.credits ?? 0,
          status: r.status,
          createdAt: r.created_at,
        })),
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setRole = useCallback(
    async (targetUser: string, role: UserRole): Promise<boolean> => {
      const res = await withJwtRetry(() =>
        supabase.rpc("set_user_role", { target_user: targetUser, new_role: role }),
      );
      if (res.error) {
        setError(res.error.message ?? "Falha ao alterar papel");
        return false;
      }
      setUsers((prev) => prev.map((u) => (u.id === targetUser ? { ...u, role } : u)));
      return true;
    },
    [],
  );

  const grantCredits = useCallback(
    async (targetUser: string, amount: number, reason: string): Promise<boolean> => {
      const res = await withJwtRetry(() =>
        supabase.rpc("grant_credits", { target_user: targetUser, amount, reason }),
      );
      if (res.error) {
        setError(res.error.message ?? "Falha ao conceder creditos");
        return false;
      }
      const newBalance = res.data as unknown as number;
      setUsers((prev) => prev.map((u) => (u.id === targetUser ? { ...u, balance: newBalance } : u)));
      return true;
    },
    [],
  );

  const resolveRequest = useCallback(async (requestId: string, approve: boolean): Promise<boolean> => {
    const res = await withJwtRetry(() =>
      supabase.rpc("resolve_credit_request", { request_id: requestId, approve }),
    );
    if (res.error) {
      setError(res.error.message ?? "Falha ao resolver pedido");
      return false;
    }
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: approve ? "approved" : "rejected" } : r)),
    );
    if (approve) void load();
    return true;
  }, [load]);

  const createPlan = useCallback(
    async (input: { name: string; credits: number; priceCents: number }): Promise<boolean> => {
      const res = await withJwtRetry(() =>
        supabase
          .from("credit_plans")
          .insert({ name: input.name, credits: input.credits, price_cents: input.priceCents })
          .select("id, name, credits, price_cents, is_active")
          .single(),
      );
      if (res.error || !res.data) {
        setError(res.error?.message ?? "Falha ao criar plano");
        return false;
      }
      const row = res.data;
      setPlans((prev) => [
        ...prev,
        {
          id: row.id,
          name: row.name,
          credits: row.credits,
          priceCents: row.price_cents,
          isActive: row.is_active,
        },
      ]);
      return true;
    },
    [],
  );

  const togglePlanActive = useCallback(async (planId: string, isActive: boolean): Promise<boolean> => {
    const res = await withJwtRetry(() =>
      supabase.from("credit_plans").update({ is_active: isActive }).eq("id", planId),
    );
    if (res.error) {
      setError(res.error.message ?? "Falha ao atualizar plano");
      return false;
    }
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, isActive } : p)));
    return true;
  }, []);

  return {
    users,
    requests,
    plans,
    loading,
    error,
    reload: load,
    setRole,
    grantCredits,
    resolveRequest,
    createPlan,
    togglePlanActive,
  };
}
