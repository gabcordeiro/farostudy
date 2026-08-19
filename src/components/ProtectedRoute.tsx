/**
 * Gate de rota autenticada. Enquanto carrega mostra skeleton (nao spinner);
 * sem sessao, redireciona para /login preservando o destino.
 * A seguranca real e da RLS -- isto e apenas UX de navegacao.
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { Skeleton } from "@/components/Skeleton";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
