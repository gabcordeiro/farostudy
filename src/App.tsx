import { Suspense, lazy, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { Mascot } from "@/components/Mascot";
import { CookieBanner } from "@/components/CookieBanner";
import { Skeleton } from "@/components/Skeleton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/useProfile";
import { WelcomeTour } from "@/features/help/WelcomeTour";

// Code-splitting das rotas (loading states definidos -> checklist #12).
const Dashboard = lazy(() => import("@/features/dashboard/Dashboard"));
const GeneratePage = lazy(() => import("@/features/ai/GeneratePage"));
const StudyPage = lazy(() => import("@/features/study/StudyPage"));
const QuizPage = lazy(() => import("@/features/quiz/QuizPage"));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage"));
const DecksPage = lazy(() => import("@/features/decks/DecksPage"));
const DeckDetailPage = lazy(() => import("@/features/decks/DeckDetailPage"));
const AdminPage = lazy(() => import("@/features/admin/AdminPage"));
const LandingPage = lazy(() => import("@/features/landing/LandingPage"));
const PlansPage = lazy(() => import("@/features/billing/PlansPage"));
const HelpPage = lazy(() => import("@/features/help/HelpPage"));
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

/** Rota autenticada com layout de app (sidebar + CTA mobile + transição). */
function AppRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>
        <PageTransition>{children}</PageTransition>
      </AppLayout>
    </ProtectedRoute>
  );
}

/** Rota autenticada + exige papel admin. */
function AdminAppRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminRoute>
        <AppLayout>
          <PageTransition>{children}</PageTransition>
        </AppLayout>
      </AdminRoute>
    </ProtectedRoute>
  );
}

/** Cabeçalho enxuto do mobile: so a marca, ja que a navegação foi para o rodapé. */
function MobileHeader() {
  return (
    <div className="flex items-center gap-2.5 border-b border-hairline bg-surface px-4 py-3 md:hidden">
      <Mascot size="sm" alt="Faro Study" />
      <span className="font-display text-base tracking-tight text-paper">Faro Study</span>
    </div>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  const { profile, loading: profileLoading, update } = useProfile();
  const [tourOpen, setTourOpen] = useState(false);

  // Usuário que nunca concluiu o tour ve ele uma única vez, ao entrar no app.
  useEffect(() => {
    if (!profileLoading && profile && !profile.onboarded_at) setTourOpen(true);
  }, [profileLoading, profile]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar so no desktop; no mobile a navegação vira barra de abas. */}
      <div className="hidden md:sticky md:top-0 md:block md:h-screen">
        <Sidebar />
      </div>
      <MobileHeader />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileNav />

      <WelcomeTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        onFinish={() => void update({ onboarded_at: new Date().toISOString() })}
      />
    </div>
  );
}

/** "/" mostra a landing pública; usuário logado vai direto ao painel. */
function HomeRoute() {
  const { session, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (session) return <Navigate to="/painel" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/planos" element={<PlansPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/termos" element={<Terms />} />
          <Route path="/obrigado" element={<ThankYou />} />

          {/* App (autenticadas) */}
          <Route path="/painel" element={<AppRoute><Dashboard /></AppRoute>} />
          <Route path="/importar" element={<AppRoute><GeneratePage /></AppRoute>} />
          <Route path="/estudar" element={<AppRoute><StudyPage /></AppRoute>} />
          <Route path="/quiz" element={<AppRoute><QuizPage /></AppRoute>} />
          <Route path="/perfil" element={<AppRoute><ProfilePage /></AppRoute>} />
          <Route path="/ajuda" element={<AppRoute><HelpPage /></AppRoute>} />
          <Route path="/trilhas" element={<AppRoute><DecksPage /></AppRoute>} />
          <Route path="/trilhas/:deckId" element={<AppRoute><DeckDetailPage /></AppRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<AdminAppRoute><AdminPage /></AdminAppRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <CookieBanner />
    </>
  );
}
