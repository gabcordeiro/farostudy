/**
 * Sidebar com o mascote Faro como logotipo (regra de UI #4 do mascote).
 * Navegacao sobria, sem hover exagerado. Colapsa em telas pequenas.
 */
import { NavLink } from "react-router-dom";
import { Mascot } from "./Mascot";
import { IconChart, IconDeck, IconLogout, IconRoute, IconUpload } from "./icons";
import { useAuth } from "@/features/auth/AuthProvider";

const NAV = [
  { to: "/painel", label: "Evolucao", Icon: IconChart },
  { to: "/estudar", label: "Estudar", Icon: IconDeck },
  { to: "/trilhas", label: "Trilhas", Icon: IconRoute },
  { to: "/importar", label: "Importar", Icon: IconUpload },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-border bg-ink-800 md:w-60">
      <div className="flex items-center gap-2.5 border-b border-slate-border px-4 py-4">
        <Mascot size="sm" alt="Faro Cards" />
        <span className="font-display text-lg tracking-tight text-paper">Faro Cards</span>
      </div>
      <nav className="flex-1 p-2" aria-label="Navegacao principal">
        <ul className="space-y-1">
          {NAV.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-ink-600 text-paper"
                      : "text-slate-soft hover:bg-ink-700 hover:text-paper"
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-slate-border p-3">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-2xs text-slate-muted" title={user.email ?? ""}>
              {user.email}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-2xs text-slate-soft hover:bg-ink-700 hover:text-paper"
            >
              <IconLogout className="h-4 w-4" />
              Sair
            </button>
          </div>
        ) : (
          <p className="text-2xs text-slate-muted">Repeticao espacada</p>
        )}
      </div>
    </aside>
  );
}
