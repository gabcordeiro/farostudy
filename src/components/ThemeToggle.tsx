/**
 * Toggle 3-vias (system / light / dark). Compacto, sem hover exagerado.
 */
import { useTheme, type ThemePreference } from "@/features/theme/ThemeProvider";
import { IconMoon, IconSun, IconSystem } from "./icons";

const ORDER: { key: ThemePreference; label: string; Icon: typeof IconSun }[] = [
  { key: "light", label: "Claro", Icon: IconSun },
  { key: "system", label: "Sistema", Icon: IconSystem },
  { key: "dark", label: "Escuro", Icon: IconMoon },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="group"
      aria-label="Tema da interface"
      className="inline-flex overflow-hidden rounded-sm border border-hairline bg-surface"
    >
      {ORDER.map(({ key, label, Icon }) => {
        const active = preference === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setPreference(key)}
            aria-pressed={active}
            title={label}
            className={`inline-flex items-center justify-center px-2 py-1 ${
              active ? "bg-elevated text-paper" : "text-slate-muted hover:text-paper"
            }`}
          >
            <Icon className="h-4 w-4" title={label} />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
