import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes, Link } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { CookieBanner } from "@/components/CookieBanner";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";

// Code-splitting das rotas (loading states definidos -> checklist #12).
const Dashboard = lazy(() => import("@/features/dashboard/Dashboard"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const ThankYou = lazy(() => import("@/pages/ThankYou"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function RouteFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/** Placeholder honesto para rotas ainda em construcao (usa o mascote). */
function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <EmptyState
        mood="sleepy"
        title={title}
        description="Esta area faz parte do roadmap do Faro Cards e sera liberada em breve."
        action={
          <Link
            to="/painel"
            className="inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
          >
            Voltar ao painel
          </Link>
        }
      />
    </div>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="md:sticky md:top-0 md:h-screen">
        <Sidebar />
      </div>
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Sticky mobile CTA (checklist producao #11) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-border bg-ink-800/95 p-3 md:hidden">
        <Link
          to="/estudar"
          className="block rounded-sm bg-action py-2.5 text-center text-sm font-medium text-ink-900"
        >
          Estudar agora
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Rotas legais sem layout de app */}
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/termos" element={<Terms />} />
          <Route path="/obrigado" element={<ThankYou />} />

          {/* App */}
          <Route path="/" element={<Navigate to="/painel" replace />} />
          <Route path="/painel" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/estudar" element={<AppLayout><Placeholder title="Sessao de estudo" /></AppLayout>} />
          <Route path="/trilhas" element={<AppLayout><Placeholder title="Trilhas de estudo" /></AppLayout>} />
          <Route path="/importar" element={<AppLayout><Placeholder title="Importar do Anki" /></AppLayout>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <CookieBanner />
    </>
  );
}
