/**
 * Sidebar com o mascote Faro como logotipo (regra de UI #4 do mascote).
 * Navegação sóbria, sem hover exagerado. Pode ser recolhida para uma régua
 * de ícones (botão no topo), com a preferência lembrada no navegador.
 * Rodape: saldo de créditos, avatar clicavel -> /perfil, tema, sair.
 */
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Mascot } from "./Mascot";
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
  IconSidebar,
  IconUpload,
} from "./icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/useProfile";
import { useCredits } from "@/features/billing/useCredits";
import { useQuizGeneration } from "@/features/quiz/QuizGenerationProvider";

const NAV = [
  { to: "/painel", label: "Evolução", Icon: IconChart },
  { to: "/estudar", label: "Estudar", Icon: IconDeck },
  { to: "/quiz", label: "Quiz", Icon: IconQuiz },
  { to: "/trilhas", label: "Trilhas", Icon: IconRoute },
  { to: "/importar", label: "Gerar", Icon: IconUpload },
  { to: "/ajuda", label: "Ajuda", Icon: IconHelp },
];

const COLLAPSE_KEY = "faro.sidebar-collapsed";

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { balance } = useCredits();
  const { generating } = useQuizGeneration();

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // sem localStorage (aba privada etc.): fica expandida, sem quebrar.
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const displayName = profile?.display_name ?? user?.email ?? "";
  const emailLabel = user?.email ?? "";

  const navItemClass = (isActive: boolean) =>
    `press relative flex items-center rounded-sm text-sm transition-colors ${
      collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"
    } ${isActive ? "bg-elevated text-paper" : "text-slate-soft hover:bg-elevated hover:text-paper"}`;

  return (
    <aside
      className={`flex h-full w-full flex-col border-r border-hairline bg-surface transition-[width] duration-300 ease-fluid ${
        collapsed ? "md:w-16" : "md:w-60"
      }`}
    >
      <div
        className={`flex items-center border-b border-hairline py-4 ${
          collapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <Link to="/painel" className="flex min-w-0 items-center gap-2.5" title="Ir para o painel">
          <Mascot size="sm" alt="Faro Study" />
          {!collapsed ? (
            <span className="truncate font-brand text-lg font-semibold text-paper">
              Faro Study
            </span>
          ) : null}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={toggle}
            aria-label="Recolher menu"
            title="Recolher menu"
            className="press shrink-0 rounded-sm p-1 text-slate-muted hover:bg-elevated hover:text-paper"
          >
            <IconSidebar className="h-[18px] w-[18px]" />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={toggle}
          aria-label="Expandir menu"
          title="Expandir menu"
          className="press mx-2 mt-2 flex justify-center rounded-sm p-2 text-slate-muted hover:bg-elevated hover:text-paper"
        >
          <IconSidebar className="h-[18px] w-[18px]" />
        </button>
      ) : null}

      <nav className="flex-1 p-2" aria-label="Navegação principal">
        <ul className="space-y-1">
          {NAV.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) => navItemClass(isActive)}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed ? label : null}
                {to === "/quiz" && generating ? (
                  <span
                    className={`h-2 w-2 animate-pulse rounded-full bg-action ${
                      collapsed ? "absolute right-1.5 top-1.5" : "ml-auto"
                    }`}
                    title="Gerando um quiz..."
                    aria-label="Gerando um quiz"
                  />
                ) : null}
              </NavLink>
            </li>
          ))}
          {profile?.role === "admin" ? (
            <li>
              <NavLink
                to="/admin"
                title={collapsed ? "Admin" : undefined}
                className={({ isActive }) => navItemClass(isActive)}
              >
                <IconShield className="h-[18px] w-[18px] shrink-0" />
                {!collapsed ? "Admin" : null}
              </NavLink>
            </li>
          ) : null}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-hairline p-3">
        {user ? (
          collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/planos"
                title={`${balance ?? "..."} créditos`}
                className="press rounded-sm p-1.5 text-slate-soft hover:bg-elevated hover:text-paper"
              >
                <IconCoin className="h-5 w-5 text-action" />
              </Link>
              <Link to="/perfil" title={emailLabel} className="press rounded-sm">
                <Avatar url={profile?.avatar_url} name={displayName} size="sm" />
              </Link>
              <ThemeToggle />
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sair"
                title="Sair"
                className="press rounded-sm p-1.5 text-slate-soft hover:bg-elevated hover:text-paper"
              >
                <IconLogout className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/planos"
                className="press flex items-center justify-between rounded-sm border border-hairline px-2.5 py-1.5 text-2xs text-slate-soft hover:border-focus hover:text-paper"
              >
                <span className="flex items-center gap-1.5">
                  <IconCoin className="h-3.5 w-3.5 text-action" />
                  {balance ?? "..."} créditos
                </span>
                <span className="text-action">+ obter</span>
              </Link>

              <Link
                to="/perfil"
                className="press flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-elevated"
                title={emailLabel}
              >
                <Avatar url={profile?.avatar_url} name={displayName} size="sm" />
                <span className="min-w-0 flex-1 truncate text-2xs text-slate-soft">
                  {displayName}
                </span>
              </Link>
              <div className="flex items-center justify-between gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex items-center gap-1 rounded-sm px-2 py-1 text-2xs text-slate-soft hover:bg-elevated hover:text-paper"
                >
                  <IconLogout className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </>
          )
        ) : (
          <ThemeToggle />
        )}
      </div>
    </aside>
  );
}
