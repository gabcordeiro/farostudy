/**
 * Transição fluida entre páginas: fade + leve subida, sem exagero.
 * Reinicia a cada troca de rota (key = pathname). Respeita
 * prefers-reduced-motion via o override global em index.css.
 */
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-rise-in">
      {children}
    </div>
  );
}
