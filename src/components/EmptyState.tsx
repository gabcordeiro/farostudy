/**
 * Empty state com o mascote Faro (regra de UI #2 do mascote).
 * Ex: "Você não tem cards para revisar hoje, que tal criar um?"
 */
import type { ReactNode } from "react";
import { Mascot, type MascotMood } from "./Mascot";

interface EmptyStateProps {
  title: string;
  description: string;
  mood?: MascotMood;
  action?: ReactNode;
}

export function EmptyState({ title, description, mood = "search", action }: EmptyStateProps) {
  return (
    <div className="animate-rise-in flex flex-col items-center justify-center gap-4 rounded-md border border-slate-border bg-ink-700 px-6 py-14 text-center">
      <Mascot size="lg" mood={mood} />
      <div className="max-w-md space-y-1.5">
        <h3 className="font-display text-xl text-paper">{title}</h3>
        <p className="text-sm text-slate-muted">{description}</p>
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
