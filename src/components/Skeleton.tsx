/**
 * Skeleton loaders (checklist produção #21 / regra #21).
 * Nunca spinners genéricos: usamos blocos que espelham o layout final.
 *
 * Shimmer em vez de pulse: o bloco fica com opacidade constante e uma faixa
 * clara atravessa da esquerda para a direita, devagar (2,4s) e em ritmo
 * linear. Pulsar faz a tela inteira piscar junto e cansa a vista; a onda
 * sugere progresso sem exigir atenção.
 *
 * `prefers-reduced-motion` desliga a onda em `index.css` -- quem pediu menos
 * movimento vê só o bloco parado.
 */
import type { HTMLAttributes } from "react";

export function Skeleton({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`skeleton-shimmer animate-shimmer rounded-sm bg-ink-600/70 ${className}`}
      aria-hidden="true"
      {...rest}
    />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}
