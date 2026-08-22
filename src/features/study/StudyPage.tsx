/**
 * Sessão de estudo: percorre cards vencidos, coleta rating (1-4), aplica
 * SM-2 (schedule) e grava log em `reviews` -- alimentando o BI do painel.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { IconDeck } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { schedule, type Rating } from "@/lib/srs";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDecks } from "@/features/ai/useDecks";
import { StudyCard } from "./StudyCard";
import { useStudyQueue, type StudyCardRow } from "./useStudyQueue";

const RATINGS: { rating: Rating; label: string; hint: string; tone: string }[] = [
  { rating: 1, label: "Errei", hint: "0d", tone: "bg-bad text-paper hover:bg-bad/80" },
  { rating: 2, label: "Difícil", hint: "curto", tone: "bg-warn text-ink-900 hover:bg-warn/80" },
  { rating: 3, label: "Bom", hint: "medio", tone: "bg-good text-paper hover:bg-good/80" },
  { rating: 4, label: "Fácil", hint: "longo", tone: "bg-action text-ink-900 hover:bg-action-deep" },
];

export default function StudyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deckId = searchParams.get("deck") ?? undefined;
  const { user } = useAuth();
  const { decks } = useDecks();
  const { queue, loading, error, setQueue } = useStudyQueue(deckId);

  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState({ reviewed: 0, correct: 0 });
  const [showHints, setShowHints] = useState(false);

  const current: StudyCardRow | undefined = queue[index];

  // Trocar de trilha reinicia a sessão -- os cards da fila mudam por baixo,
  // entao o indice e o placar antigos nao fazem mais sentido.
  useEffect(() => {
    setIndex(0);
    setShowBack(false);
    setDone({ reviewed: 0, correct: 0 });
  }, [deckId]);

  const advance = useCallback(() => {
    setShowBack(false);
    setStartedAt(Date.now());
    setIndex((i) => i + 1);
  }, []);

  const grade = useCallback(
    async (rating: Rating) => {
      if (!current || !user) return;
      setSaving(true);
      setSaveError(null);

      const prev = {
        intervalDays: current.interval_days,
        easeFactor: current.ease_factor,
        reps: current.reps,
        lapses: current.lapses,
        state: current.state,
      };
      const next = schedule(prev, rating);
      const durationMs = Math.max(0, Math.min(600000, Date.now() - startedAt));

      const updateRes = await withJwtRetry(() =>
        supabase
          .from("cards")
          .update({
            state: next.state,
            due_at: next.dueAt.toISOString(),
            interval_days: next.intervalDays,
            ease_factor: next.easeFactor,
            reps: next.reps,
            lapses: next.lapses,
          })
          .eq("id", current.id),
      );
      if (updateRes.error) {
        setSaveError(updateRes.error.message ?? "Falha ao salvar");
        setSaving(false);
        return;
      }

      const insertRes = await withJwtRetry(() =>
        supabase.from("reviews").insert({
          user_id: user.id,
          card_id: current.id,
          deck_id: current.deck_id,
          category_id: current.category_id,
          rating,
          duration_ms: durationMs,
          prev_interval: prev.intervalDays,
          next_interval: next.intervalDays,
        }),
      );
      if (insertRes.error) {
        setSaveError(insertRes.error.message ?? "Falha ao salvar");
        setSaving(false);
        return;
      }

      // Remove esse card da fila local (não vai reaparecer nesta sessão).
      setQueue((q) => q.filter((c) => c.id !== current.id));
      setDone((d) => ({ reviewed: d.reviewed + 1, correct: d.correct + (rating >= 3 ? 1 : 0) }));
      setSaving(false);
      advance();
    },
    [current, user, startedAt, setQueue, advance],
  );

  const total = useMemo(() => queue.length + done.reviewed, [queue.length, done.reviewed]);

  // Atalhos de teclado: Espaco/Enter revela a resposta, 1-4 avalia.
  // Ignorados quando o foco esta num campo de texto.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!current || saving) return;

      if (!showBack) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setShowBack(true);
        }
        return;
      }
      if (e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        void grade(Number(e.key) as Rating);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, showBack, saving, grade]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <SEO title="Estudar" description="Revise seus flashcards vencidos." path="/estudar" noindex />

      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconDeck className="h-6 w-6 text-focus-soft" title="Estudar" />
          <div>
            <h1 className="font-display text-2xl text-paper">Sessão de estudo</h1>
            <p className="text-sm text-slate-muted">
              {done.reviewed} de {total} revisadas
            </p>
          </div>
        </div>
        <div className="text-right text-2xs text-slate-muted">
          <p>Acertos</p>
          <p className="font-mono text-sm text-paper">
            {done.reviewed ? Math.round((done.correct / done.reviewed) * 100) : 0}%
          </p>
        </div>
      </header>

      <div className="mb-6">
        <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">
          Trilha
        </label>
        <select
          value={deckId ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            setSearchParams(value ? { deck: value } : {});
          }}
          className="w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus sm:w-64"
        >
          <option value="">Todas as trilhas</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-md border border-bad/40 bg-elevated p-6 text-center">
          <p className="text-sm text-slate-soft">Não foi possível carregar seus cards.</p>
          <p className="mt-1 text-2xs text-slate-muted">{error}</p>
        </div>
      ) : current ? (
        <div className="space-y-4">
          <StudyCard key={current.id} card={current} showBack={showBack} />

          {saveError ? (
            <p role="alert" className="text-2xs text-bad">
              {saveError}
            </p>
          ) : null}

          {!showBack ? (
            <>
              <button
                type="button"
                onClick={() => setShowBack(true)}
                className="w-full rounded-sm bg-focus py-3 text-sm font-medium text-paper hover:bg-focus-deep"
              >
                Mostrar resposta
              </button>
              <button
                type="button"
                onClick={() => setShowHints((v) => !v)}
                className="block w-full text-center text-2xs text-slate-muted underline decoration-dotted underline-offset-2 hover:text-slate-soft"
              >
                Atalhos de teclado
              </button>
              {showHints ? (
                <p className="text-center text-2xs text-slate-muted">
                  Dica: aperte <kbd className="font-mono text-slate-soft">espaço</kbd> para revelar
                </p>
              ) : null}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RATINGS.map(({ rating, label, hint, tone }) => (
                  <button
                    key={rating}
                    type="button"
                    disabled={saving}
                    onClick={() => void grade(rating)}
                    className={`rounded-sm px-3 py-3 text-sm font-medium disabled:opacity-60 ${tone}`}
                  >
                    <span className="block">{label}</span>
                    <span className="mt-0.5 block text-2xs opacity-80">{hint}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowHints((v) => !v)}
                className="block w-full text-center text-2xs text-slate-muted underline decoration-dotted underline-offset-2 hover:text-slate-soft"
              >
                Atalhos de teclado
              </button>
              {showHints ? (
                <p className="text-center text-2xs text-slate-muted">
                  Dica: use as teclas <kbd className="font-mono text-slate-soft">1</kbd> a{" "}
                  <kbd className="font-mono text-slate-soft">4</kbd> para avaliar
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : done.reviewed > 0 ? (
        <EmptyState
          mood="proud"
          title="Sessão concluida"
          description={`Você revisou ${done.reviewed} cards com ${Math.round(
            (done.correct / done.reviewed) * 100,
          )}% de acerto. O Faro já atualizou seu painel.`}
          action={
            <Link
              to="/painel"
              className="inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
            >
              Ver painel
            </Link>
          }
        />
      ) : (
        <EmptyState
          mood="yawning"
          title="Nada vencido por hoje"
          description="O Faro não encontrou cards vencidos para revisar agora. Gere novos cards ou volte depois."
          action={
            <Link
              to="/importar"
              className="inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
            >
              Gerar cards
            </Link>
          }
        />
      )}
    </div>
  );
}
