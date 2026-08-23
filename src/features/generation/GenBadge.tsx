/**
 * Bolinha de status para os itens de menu (Quiz / Gerar). Pulsa em âmbar
 * enquanto há geração rodando e fica verde quando terminou e o usuário ainda
 * não viu -- some assim que ele reconhece o desfecho na bandeja.
 */
import { useGeneration } from "./GenerationProvider";
import type { GenKind } from "./types";

export function GenBadge({ kind, className = "" }: { kind: GenKind; className?: string }) {
  const { runningByKind, hasActivity } = useGeneration();
  if (!hasActivity(kind)) return null;
  const running = Boolean(runningByKind(kind));
  return (
    <span
      role="status"
      aria-label={running ? "Geração em andamento" : "Geração concluída"}
      className={`h-2 w-2 shrink-0 rounded-full ${running ? "animate-pulse bg-action" : "bg-good"} ${className}`}
    />
  );
}
