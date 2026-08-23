/**
 * Anima um número de 0 até `target` na montagem (ease-out), para dar vida aos
 * indicadores do painel. Respeita prefers-reduced-motion: nesse caso mostra o
 * valor final direto, sem contar.
 */
import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !Number.isFinite(target)
    ) {
      setValue(target);
      return;
    }

    let start: number | null = null;
    setValue(0);
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);

  return value;
}
