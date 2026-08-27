/**
 * Quiz competitivo assíncrono: cada amigo abre esse link, responde no
 * próprio tempo (mesmas perguntas, ordem de alternativas embaralhada por
 * pessoa) e entra num placar comum. Uma tentativa por pessoa -- ver
 * migração 0017_quiz_challenges.sql para o porquê disso e de nome/foto
 * virem gravados na tentativa em vez de lidos de profiles.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Mascot } from "@/components/Mascot";
import { Avatar } from "@/components/Avatar";
import { IconLink, IconTrophy } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { burst, celebrate } from "@/lib/confetti";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/useProfile";
import { useQuizChallengesEnabled } from "./useQuizChallengesFlag";
import { QuizRunner } from "./QuizRunner";
import { type QuizChoice, type QuizItem } from "./generateQuiz";
import {
  fetchAttempts,
  fetchChallenge,
  submitAttempt,
  type QuizChallenge,
  type QuizChallengeAttempt,
} from "./quizChallenges";

interface DisplayItem extends QuizItem {
  shuffled: QuizChoice[];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}min ${s % 60}s`;
}

function Leaderboard({
  attempts,
  myUserId,
  challengeId,
}: {
  attempts: QuizChallengeAttempt[];
  myUserId: string | undefined;
  challengeId: string;
}) {
  const { notify } = useToast();

  async function copyLink() {
    const url = `${window.location.origin}/desafio/${challengeId}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copiado!", "success");
    } catch {
      notify(url, "info");
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {attempts.map((a, i) => (
          <li
            key={a.id}
            className={`flex items-center gap-3 rounded-md border px-4 py-3 ${
              a.userId === myUserId ? "border-focus bg-focus/10" : "border-hairline bg-elevated"
            }`}
          >
            <span className="w-5 shrink-0 text-center font-mono text-sm text-slate-muted">{i + 1}</span>
            <Avatar url={a.avatarUrl} name={a.displayName} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm text-paper">
              {a.displayName || "Jogador"}
              {a.userId === myUserId ? " (você)" : ""}
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-sm text-paper">
                {a.score}/{a.total}
              </span>
              <span className="block text-2xs text-slate-muted">{formatDuration(a.durationMs)}</span>
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="press inline-flex items-center gap-1.5 rounded-sm border border-hairline px-4 py-2 text-sm text-paper hover:border-focus"
      >
        <IconLink className="h-4 w-4" />
        Copiar link do desafio
      </button>
    </div>
  );
}

export default function QuizChallengePage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { notify } = useToast();
  const challengesEnabled = useQuizChallengesEnabled();

  const [challenge, setChallenge] = useState<QuizChallenge | null>(null);
  const [attempts, setAttempts] = useState<QuizChallengeAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [items, setItems] = useState<DisplayItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  const current = items[index];
  const isLast = current && index === items.length - 1;
  const playingFinished = !current && items.length > 0;
  const myAttempt = user ? attempts.find((a) => a.userId === user.id) : undefined;

  const load = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    const [c, a] = await Promise.all([fetchChallenge(challengeId), fetchAttempts(challengeId)]);
    if (!c) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setChallenge(c);
    setAttempts(a);
    setLoading(false);
  }, [challengeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (playingFinished) celebrate();
  }, [playingFinished]);

  // Ao terminar de responder, grava a tentativa uma unica vez e recarrega o
  // placar (que passa a incluir a propria nota).
  useEffect(() => {
    if (!playingFinished || submitting || myAttempt || !user || !challengeId) return;
    setSubmitting(true);
    const durationMs = startedAtRef.current ? Date.now() - startedAtRef.current : null;
    void submitAttempt({
      challengeId,
      userId: user.id,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      score: score.correct,
      total: score.total,
      durationMs,
    }).then(async (ok) => {
      if (ok) await load();
      else notify("Não foi possível registrar sua nota no placar.", "error");
      setSubmitting(false);
    });
  }, [playingFinished, submitting, myAttempt, user, challengeId, profile, score, load, notify]);

  function handleStart() {
    if (!challenge) return;
    const built = challenge.items.map((it) => ({ ...it, shuffled: shuffle(it.choices) }));
    startedAtRef.current = Date.now();
    setItems(built);
    setIndex(0);
    setAnswer(null);
    setScore({ correct: 0, total: 0 });
  }

  function handleAnswer(choiceIdx: number) {
    if (!current || answer !== null) return;
    setAnswer(choiceIdx);
    const chosen = current.shuffled[choiceIdx];
    const correct = chosen?.isCorrect === true;
    if (correct) burst();
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  }

  function next() {
    setAnswer(null);
    setIndex((i) => i + 1);
  }

  if (challengesEnabled === false) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <EmptyState
          mood="sleepy"
          title="Desafios pausados"
          description="Essa função está temporariamente desativada."
          action={
            <Link
              to="/quiz"
              className="press inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
            >
              Ir para o Quiz
            </Link>
          }
        />
      </div>
    );
  }

  if (challengesEnabled === null || loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (notFound || !challenge || !challengeId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <EmptyState
          mood="sleepy"
          title="Desafio não encontrado"
          description="Esse link não existe mais."
          action={
            <Link
              to="/quiz"
              className="press inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
            >
              Ir para o Quiz
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <SEO title={challenge.title} description="Desafio de quiz entre amigos." path={`/desafio/${challengeId}`} noindex />

      <header className="mb-6 flex items-center gap-3">
        <IconTrophy className="h-6 w-6 text-focus-soft" title="Desafio" />
        <div>
          <h1 className="font-display text-2xl text-paper">{challenge.title}</h1>
          <p className="text-sm text-slate-muted">
            {challenge.itemCount} perguntas
            {challenge.creatorName ? ` · desafio de ${challenge.creatorName}` : ""}
          </p>
        </div>
      </header>

      {current ? (
        <QuizRunner
          current={current}
          index={index}
          total={items.length}
          score={score}
          answer={answer}
          onAnswer={handleAnswer}
          onNext={next}
          isLast={isLast}
        />
      ) : myAttempt ? (
        <>
          <p className="mb-4 text-sm text-slate-muted">
            Você tirou <span className="font-mono text-paper">{myAttempt.score}/{myAttempt.total}</span>. Veja como
            ficou o placar:
          </p>
          <Leaderboard attempts={attempts} myUserId={user?.id} challengeId={challengeId} />
        </>
      ) : playingFinished ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Mascot mood="winking" size="lg" alt="Faro comemorando o fim do desafio" />
          <p className="text-lg text-paper">
            Você acertou {score.correct} de {score.total}!
          </p>
          <p className="text-sm text-slate-muted">Registrando sua nota no placar...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 rounded-md border border-hairline bg-elevated p-8 text-center">
          <Mascot mood="cheer" size="lg" alt="Faro pronto pro desafio" />
          <p className="text-sm text-slate-muted">
            {attempts.length > 0
              ? `${attempts.length} ${attempts.length === 1 ? "pessoa já respondeu" : "pessoas já responderam"}. Bora ver se você chega no topo?`
              : "Seja o primeiro a responder e comece o placar."}
          </p>
          <button
            type="button"
            onClick={handleStart}
            className="press rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep"
          >
            Começar
          </button>
          {attempts.length > 0 ? (
            <Leaderboard attempts={attempts} myUserId={user?.id} challengeId={challengeId} />
          ) : null}
        </div>
      )}
    </div>
  );
}
