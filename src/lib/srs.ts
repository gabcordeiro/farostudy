/**
 * Repetição espaçada - variacao do SM-2 e utilidades da curva de esquecimento.
 * Puro e testável: sem I/O aqui.
 */

export type Rating = 1 | 2 | 3 | 4; // again | hard | good | easy

export interface SrsState {
  intervalDays: number;
  easeFactor: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning" | "suspended";
}

const MIN_EASE = 1.3;

/** Calcula o próximo estado do card dado o rating do usuário. */
export function schedule(prev: SrsState, rating: Rating, now = new Date()): SrsState & { dueAt: Date } {
  let { intervalDays, easeFactor, reps, lapses } = prev;
  let state = prev.state;

  if (rating === 1) {
    // errou -> volta a reaprender
    lapses += 1;
    reps = 0;
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
    intervalDays = 0;
    state = "relearning";
  } else {
    reps += 1;
    // ajuste de ease por qualidade
    const delta = rating === 2 ? -0.15 : rating === 4 ? 0.15 : 0;
    easeFactor = Math.max(MIN_EASE, easeFactor + delta);

    if (reps === 1) intervalDays = rating === 4 ? 4 : 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor * (rating === 2 ? 0.8 : 1));

    state = "review";
  }

  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { intervalDays, easeFactor, reps, lapses, state, dueAt };
}

/**
 * Retenção prevista pela curva de esquecimento (Ebbinghaus):
 * R = e^(-t / S), onde S (estabilidade em dias) cresce com o intervalo/ease.
 * Usada no BI para projetar quando uma categoria cai abaixo do alvo.
 */
export function predictedRetention(daysSinceReview: number, stabilityDays: number): number {
  if (stabilityDays <= 0) return 0;
  return Math.exp(-daysSinceReview / stabilityDays);
}

/** Dias até a retenção prevista cair até `target` (ex: 0.9). */
export function daysUntilRetention(stabilityDays: number, target = 0.9): number {
  if (stabilityDays <= 0) return 0;
  return Math.max(0, Math.round(-stabilityDays * Math.log(target)));
}
