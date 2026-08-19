/**
 * Navegação inferior do mobile (estilo app).
 * Substitui a sidebar empilhada, que empurrava o conteúdo da página para
 * baixo da dobra em telas pequenas. Mostra as quatro áreas do dia a dia;
 * o resto (Trilhas, Ajuda, Perfil, Admin) fica no menu "Mais".
 */
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Avatar } from "./Avatar";
import { ThemeToggle } from "./ThemeToggle";
import {
  IconChart,
  IconCoin,
  IconDeck,
  IconHelp,
  IconLogout,
  IconQuiz,
  IconRoute,
  IconShield,
  IconUpload,
  IconMore,
} from "./icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/useProfile";
import { useCredits } from "@/features/billing/useCredits";

const PRIMARY = [
  { to: "/painel", label: "Evolução", Icon: IconChart },
  { to: "/estudar", label: "Estudar", Icon: IconDeck },
  { to: "/quiz", label: "Quiz", Icon: IconQuiz },
  { to: "/importar", label: "Importar", Icon: IconUpload },
];

const SECONDARY = [
  { to: "/trilhas", label: "Trilhas", Icon: IconRoute },
  { to: "/ajuda", label: "Ajuda", Icon: IconHelp },
];

export function MobileNav() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { balance } = useCredits();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Fecha o menu ao trocar de rota.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const displayName = profile?.display_name ?? user?.email ?? "";
  const tabClass = (isActive: boolean) =>
    `flex flex-1 flex-col items-center gap-1 py-2 text-2xs transition-colors ${
      isActive ? "text-action" : "text-slate-muted"
    }`;

  return (
    <>
      {/* Folha do menu "Mais" */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-page/80"
          />
          <div className="absolute inset-x-0 bottom-0 animate-rise-in space-y-2 border-t border-hairline bg-surface p-4 pb-6">
            <Link
              to="/perfil"
              className="flex items-center gap-3 rounded-sm px-2 py-2 hover:bg-elevated"
            >
              <Avatar url={profile?.avatar_url} name={displayName} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm text-paper">{displayName}</span>
              <span className="text-2xs text-slate-muted">Perfil</span>
            </Link>

            {SECONDARY.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-slate-soft hover:bg-elevated hover:text-paper"
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            ))}

            {profile?.role === "admin" ? (
              <Link
                to="/admin"
                className="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-slate-soft hover:bg-elevated hover:text-paper"
              >
                <IconShield className="h-[18px] w-[18px]" />
                Admin
              </Link>
            ) : null}

            <Link
              to="/planos"
              className="flex items-center justify-between rounded-sm border border-hairline px-3 py-2 text-sm text-slate-soft"
            >
              <span className="flex items-center gap-2">
                <IconCoin className="h-4 w-4 text-action" />
                {balance ?? "..."} créditos
              </span>
              <span className="text-2xs text-action">+ obter</span>
            </Link>

            <div className="flex items-center justify-between gap-2 pt-1">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-2xs text-slate-soft hover:text-paper"
              >
                <IconLogout className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Barra de abas fixa */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hairline bg-surface md:hidden"
      >
        {PRIMARY.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => tabClass(isActive)}>
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className={tabClass(menuOpen)}
        >
          <IconMore className="h-5 w-5" />
          Mais
        </button>
      </nav>
    </>
  );
}
