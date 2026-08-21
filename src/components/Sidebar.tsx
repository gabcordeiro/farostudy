/**
 * Sidebar com o mascote Faro como logotipo (regra de UI #4 do mascote).
 * Navegação sóbria, sem hover exagerado. Colapsa em telas pequenas.
 * Rodape: saldo de créditos, avatar clicavel -> /perfil, tema, sair.
 */
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
  IconUpload,
} from "./icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/useProfile";
import { useCredits } from "@/features/billing/useCredits";

const NAV = [
  { to: "/painel", label: "Evolução", Icon: IconChart },
  { to: "/estudar", label: "Estudar", Icon: IconDeck },
  { to: "/quiz", label: "Quiz", Icon: IconQuiz },
  { to: "/trilhas", label: "Trilhas", Icon: IconRoute },
  { to: "/importar", label: "Importar", Icon: IconUpload },
  { to: "/ajuda", label: "Ajuda", Icon: IconHelp },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { balance } = useCredits();

  const displayName = profile?.display_name ?? user?.email ?? "";
  const emailLabel = user?.email ?? "";

  return (
    <aside className="flex h-full w-full flex-col border-r border-hairline bg-surface md:w-60">
      <Link to="/painel" className="flex items-center gap-2.5 border-b border-hairline px-4 py-4">
        <Mascot size="sm" alt="Faro Study" />
        <span className="font-display text-lg tracking-tight text-paper">Faro Study</span>
      </Link>
      <nav className="flex-1 p-2" aria-label="Navegação principal">
        <ul className="space-y-1">
          {NAV.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-elevated text-paper"
                      : "text-slate-soft hover:bg-elevated hover:text-paper"
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </NavLink>
            </li>
          ))}
          {profile?.role === "admin" ? (
            <li>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-elevated text-paper"
                      : "text-slate-soft hover:bg-elevated hover:text-paper"
                  }`
                }
              >
                <IconShield className="h-[18px] w-[18px]" />
                Admin
              </NavLink>
            </li>
          ) : null}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-hairline p-3">
        {user ? (
          <>
            <Link
              to="/planos"
              className="flex items-center justify-between rounded-sm border border-hairline px-2.5 py-1.5 text-2xs text-slate-soft transition-colors duration-150 hover:border-focus hover:text-paper"
            >
              <span className="flex items-center gap-1.5">
                <IconCoin className="h-3.5 w-3.5 text-action" />
                {balance ?? "..."} créditos
              </span>
              <span className="text-action">+ obter</span>
            </Link>

            <Link
              to="/perfil"
              className="flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-elevated"
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
        ) : (
          <ThemeToggle />
        )}
      </div>
    </aside>
  );
}
