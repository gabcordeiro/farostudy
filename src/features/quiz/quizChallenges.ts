/**
 * Quiz competitivo assíncrono: o criador congela um snapshot das perguntas
 * num desafio compartilhável; cada amigo responde no próprio tempo e entra
 * no placar. Ver a migração 0017_quiz_challenges.sql para o porquê de
 * nome/foto virem gravados na tentativa em vez de lidos de profiles.
 */
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import type { QuizItem } from "./generateQuiz";

export interface QuizChallenge {
  id: string;
  creatorId: string;
  creatorName: string | null;
  title: string;
  items: QuizItem[];
  itemCount: number;
  createdAt: string;
}

export interface QuizChallengeAttempt {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  total: number;
  durationMs: number | null;
  createdAt: string;
}

export async function createChallenge(input: {
  title: string;
  items: QuizItem[];
  creatorId: string;
  creatorName: string | null;
}): Promise<string | null> {
  const res = await withJwtRetry(() =>
    supabase
      .from("quiz_challenges")
      .insert({
        creator_id: input.creatorId,
        creator_name: input.creatorName,
        title: input.title,
        items: input.items,
      })
      .select("id")
      .single(),
  );
  if (res.error || !res.data) return null;
  return res.data.id;
}

export async function fetchChallenge(id: string): Promise<QuizChallenge | null> {
  const res = await withJwtRetry(() =>
    supabase
      .from("quiz_challenges")
      .select("id, creator_id, creator_name, title, items, item_count, created_at")
      .eq("id", id)
      .maybeSingle(),
  );
  if (res.error || !res.data) return null;
  const r = res.data;
  return {
    id: r.id,
    creatorId: r.creator_id,
    creatorName: r.creator_name,
    title: r.title,
    items: r.items as unknown as QuizItem[],
    itemCount: r.item_count,
    createdAt: r.created_at,
  };
}

export async function fetchAttempts(challengeId: string): Promise<QuizChallengeAttempt[]> {
  const res = await withJwtRetry(() =>
    supabase
      .from("quiz_challenge_attempts")
      .select("id, user_id, display_name, avatar_url, score, total, duration_ms, created_at")
      .eq("challenge_id", challengeId)
      .order("score", { ascending: false })
      .order("duration_ms", { ascending: true, nullsFirst: false }),
  );
  if (res.error || !res.data) return [];
  return res.data.map((r) => ({
    id: r.id,
    userId: r.user_id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    score: r.score,
    total: r.total,
    durationMs: r.duration_ms,
    createdAt: r.created_at,
  }));
}

export async function submitAttempt(input: {
  challengeId: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  total: number;
  durationMs: number | null;
}): Promise<boolean> {
  const res = await withJwtRetry(() =>
    supabase.from("quiz_challenge_attempts").insert({
      challenge_id: input.challengeId,
      user_id: input.userId,
      display_name: input.displayName,
      avatar_url: input.avatarUrl,
      score: input.score,
      total: input.total,
      duration_ms: input.durationMs,
    }),
  );
  return !res.error;
}
