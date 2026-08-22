import { Suspense, lazy, useEffect, useState } from "react";
import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { Mascot } from "@/components/Mascot";
import { CookieBanner } from "@/components/CookieBanner";
import { Analytics } from "@/components/Analytics";
import { Skeleton } from "@/components/Skeleton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/useProfile";
import { WelcomeTour } from "@/features/help/WelcomeTour";
import type { AppOutletContext } from "@/lib/appOutletContext";

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

/** Cabeçalho enxuto do mobile: so a marca, ja que a navegação foi para o rodapé. */
function MobileHeader() {
  return (
    <Link
      to="/painel"
      className="flex items-center gap-2.5 border-b border-hairline bg-surface px-4 py-3 md:hidden"
    >
      <Mascot size="sm" alt="Faro Study" />
      <span className="font-display text-base tracking-tight text-paper">Faro Study</span>
    </Link>
  );
}

/**
 * Layout persistente do app autenticado: monta uma vez (via rota-pai com
 * <Outlet/>) e sobrevive à troca entre /painel, /importar etc. -- diferente
 * de antes, quando cada rota recriava o layout do zero. Isso é o que permite
 * o tour de boas-vindas navegar de aba em aba sem perder o próprio estado.
 */
function AppLayout() {
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
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <PageTransition>
          <Outlet context={{ openTour: () => setTourOpen(true) } satisfies AppOutletContext} />
        </PageTransition>
      </main>
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

          {/* App (autenticadas). Rota-pai com <Outlet/>: o layout monta uma
              vez só e sobrevive à troca entre essas abas -- é o que deixa o
              tour de boas-vindas navegar de página em página sem se perder. */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/painel" element={<Dashboard />} />
            <Route path="/importar" element={<GeneratePage />} />
            <Route path="/estudar" element={<StudyPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/ajuda" element={<HelpPage />} />
            <Route path="/trilhas" element={<DecksPage />} />
            <Route path="/trilhas/:deckId" element={<DeckDetailPage />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute><AdminRoute><AppLayout /></AdminRoute></ProtectedRoute>}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <CookieBanner />
      <Analytics />
    </>
  );
}
