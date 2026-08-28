/**
 * Gate de rota admin: além de logado, exige profile.role === 'admin'.
 * A segurança real esta nas RPCs (is_admin() no banco); isto e só UX.
 */
import { Link } from "react-router-dom";
import { useProfile } from "@/features/profile/useProfile";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import type { ReactNode } from "react";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <EmptyState
          mood="sleepy"
          title="Acesso restrito"
          description="Essa área é só para administradores."
          action={
            <Link
              to="/painel"
              className="inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-action-ink hover:bg-action-deep"
            >
              Voltar ao painel
            </Link>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
