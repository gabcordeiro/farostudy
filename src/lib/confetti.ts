/**
 * Confete de celebração (fim de sessão de estudo, quiz, acerto e tour).
 * Cores da própria marca (indigo + laranja + verde de acerto), nunca
 * arco-íris -- mesma regra de paleta do resto do app.
 *
 * IMPORTANTE (useWorker: false): por padrão o canvas-confetti tenta rodar
 * num Web Worker criado a partir de um blob:. A nossa CSP de produção
 * (script-src 'self', sem worker-src/blob:) bloqueia esse worker -- e a
 * biblioteca, antes de descobrir isso, já transferiu o canvas para um
 * OffscreenCanvas, que fica órfão e nunca desenha. Resultado: em produção o
 * confete simplesmente não aparecia. Criando a instância com useWorker:false
 * ele desenha direto na thread principal e funciona sob a CSP.
 */
import confetti from "canvas-confetti";

const BRAND_COLORS = ["#5B57D6", "#7A76E8", "#F2762E", "#F79355", "#3F9C74"];

// Instância única, criada sob demanda (evita montar o canvas antes da hora).
let fireInstance: confetti.CreateTypes | null = null;
function fire(opts: confetti.Options): void {
  if (!fireInstance) {
    fireInstance = confetti.create(undefined, { useWorker: false, resize: true });
  }
  void fireInstance(opts);
}

function prefersReduced(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Celebração cheia: dois jatos das laterais. Usada em fim de quiz/sessão/tour.
 * `force` ignora prefers-reduced-motion -- só para o botão de teste do admin,
 * onde a pessoa clicou de propósito para ver o efeito.
 */
export function celebrate(opts?: { force?: boolean }): void {
  if (!opts?.force && prefersReduced()) return;
  const base = { colors: BRAND_COLORS, zIndex: 9999 };
  fire({ ...base, particleCount: 70, spread: 70, origin: { x: 0.2, y: 0.7 } });
  fire({ ...base, particleCount: 70, spread: 70, origin: { x: 0.8, y: 0.7 } });
}

/**
 * Estouro pequeno e rápido, do centro-baixo -- para microacertos (uma
 * resposta certa no quiz), sem o peso da celebração completa.
 */
export function burst(opts?: { force?: boolean }): void {
  if (!opts?.force && prefersReduced()) return;
  fire({
    colors: BRAND_COLORS,
    zIndex: 9999,
    particleCount: 32,
    spread: 55,
    startVelocity: 32,
    scalar: 0.9,
    origin: { x: 0.5, y: 0.62 },
  });
}
