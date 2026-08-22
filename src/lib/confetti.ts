/**
 * Confete de celebração (fim de sessão de estudo, quiz e tour de boas-vindas).
 * Cores da própria marca (indigo + laranja + verde de acerto), nunca
 * arco-íris -- mesma regra de paleta do resto do app. Respeita
 * prefers-reduced-motion, como o resto do app já faz (PageTransition, Skeleton).
 */
import confetti from "canvas-confetti";

const BRAND_COLORS = ["#5B57D6", "#7A76E8", "#F2762E", "#F79355", "#3F9C74"];

export function celebrate(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const base = { colors: BRAND_COLORS, disableForReducedMotion: true, zIndex: 9999 };
  confetti({ ...base, particleCount: 70, spread: 70, origin: { x: 0.2, y: 0.7 } });
  confetti({ ...base, particleCount: 70, spread: 70, origin: { x: 0.8, y: 0.7 } });
}
