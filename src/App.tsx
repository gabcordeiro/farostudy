import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes, Link } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { CookieBanner } from "@/components/CookieBanner";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Code-splitting das rotas (loading states definidos -> checklist #12).
const Dashboard = lazy(() => import("@/features/dashboard/Dashboard"));
const GeneratePage = lazy(() => import("@/features/ai/GeneratePage"));
const StudyPage = lazy(() => import("@/features/study/StudyPage"));
const QuizPage = lazy(() => import("@/features/quiz/QuizPage"));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const ThankYou = lazy(() => import("@/pages/ThankYou"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const AuthCallback = lazy(() =>
  import("@/features/auth/AuthCallback").then((m) => ({ default: m.AuthCallback })),
);

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

/** Rota autenticada com layout de app (sidebar + CTA mobile). */
function AppRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
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
          {/* Auth (publicas) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Rotas legais sem layout de app */}
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/termos" element={<Terms />} />
          <Route path="/obrigado" element={<ThankYou />} />

          {/* App (autenticadas) */}
          <Route path="/" element={<Navigate to="/painel" replace />} />
          <Route path="/painel" element={<AppRoute><Dashboard /></AppRoute>} />
          <Route path="/importar" element={<AppRoute><GeneratePage /></AppRoute>} />
          <Route path="/estudar" element={<AppRoute><StudyPage /></AppRoute>} />
          <Route path="/quiz" element={<AppRoute><QuizPage /></AppRoute>} />
          <Route path="/perfil" element={<AppRoute><ProfilePage /></AppRoute>} />
          <Route path="/trilhas" element={<AppRoute><Placeholder title="Trilhas de estudo" /></AppRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <CookieBanner />
    </>
  );
}
