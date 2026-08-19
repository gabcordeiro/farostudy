/**
 * Gate de rota admin: além de logado, exige profile.role === 'admin'.
 * A segurança real esta nas RPCs (is_admin() no banco); isto e só UX.
 */
import { Navigate } from "react-router-dom";
import { useProfile } from "@/features/profile/useProfile";
import { Skeleton } from "@/components/Skeleton";
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
    return <Navigate to="/painel" replace />;
  }

  return <>{children}</>;
}
