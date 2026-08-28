/**
 * Sessão de estudo: percorre cards vencidos, coleta rating (1-4), aplica
 * SM-2 (schedule) e grava log em `reviews` -- alimentando o BI do painel.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { IconDeck, IconChevronDown, IconCheck } from "@/components/icons";
import { RatingExplainer } from "@/features/help/RatingExplainer";
import { RATING_EXPLAINER } from "@/features/help/content";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { schedule, type Rating } from "@/lib/srs";
import { celebrate } from "@/lib/confetti";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDecks } from "@/features/ai/useDecks";
import { StudyCard } from "./StudyCard";
import { useStudyQueue, type StudyCardRow } from "./useStudyQueue";

// Degradê vermelho -> verde (do pior pra melhor), com as 4 cores que já
// existem no design system -- sem inventar tom novo (feedback real: a
// ordem antiga colocava Fácil em laranja e Bom em verde, invertido).
// Mostra a explicação da nota só até o usuário fechar uma vez -- depois
// disso ela some por padrão e fica só na Ajuda (RATING_EXPLAINER, mesmo
// conteúdo, para não divergir).
const RATING_EXPLAINER_SEEN_KEY = "faro.rating-explainer-seen.v1";

const RATINGS: { rating: Rating; label: string; tone: string }[] = [
  { rating: 1, label: "Errei", tone: "bg-bad text-paper hover:bg-bad/80" },
  { rating: 2, label: "Difícil", tone: "bg-action text-ink-900 hover:bg-action-deep" },
  { rating: 3, label: "Bom", tone: "bg-warn text-ink-900 hover:bg-warn/80" },
  { rating: 4, label: "Fácil", tone: "bg-good text-paper hover:bg-good/80" },
];

export default function StudyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deckIds = useMemo(() => searchParams.getAll("deck"), [searchParams]);
  const deckKey = deckIds.join(",");
  const { user } = useAuth();
  const { decks } = useDecks();
  const [cram, setCram] = useState(false);
  const { queue, loading, error, setQueue } = useStudyQueue(deckIds, cram);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);
  const deckMenuRef = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState({ reviewed: 0, correct: 0 });
  const [showHints, setShowHints] = useState(false);
  const [showRatingExplainer, setShowRatingExplainer] = useState(
    () => !localStorage.getItem(RATING_EXPLAINER_SEEN_KEY),
  );
  const dismissRatingExplainer = useCallback(() => {
    localStorage.setItem(RATING_EXPLAINER_SEEN_KEY, "1");
    setShowRatingExplainer(false);
  }, []);

  const current: StudyCardRow | undefined = queue[index];
  const sessionFinished = !current && done.reviewed > 0;

  // Confete só na transição pra "concluida" -- useEffect com esse boolean
  // como dependencia dispara uma vez por sessão terminada, não a cada render.
  useEffect(() => {
    if (sessionFinished) celebrate();
  }, [sessionFinished]);

  // Trocar de trilha (ou entrar/sair do modo adiantado) reinicia a sessão --
  // os cards da fila mudam por baixo, entao o indice e o placar antigos nao
  // fazem mais sentido.
  useEffect(() => {
    setIndex(0);
    setShowBack(false);
    setDone({ reviewed: 0, correct: 0 });
  }, [deckKey, cram]);

  // Fecha o menu de trilhas ao clicar fora dele.
  useEffect(() => {
    if (!deckMenuOpen) return;
    function onClick(e: MouseEvent) {
      if (deckMenuRef.current && !deckMenuRef.current.contains(e.target as Node)) {
        setDeckMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [deckMenuOpen]);

  const toggleDeck = useCallback(
    (id: string) => {
      const next = deckIds.includes(id) ? deckIds.filter((d) => d !== id) : [...deckIds, id];
      const params = new URLSearchParams(searchParams);
      params.delete("deck");
      next.forEach((d) => params.append("deck", d));
      setSearchParams(params);
    },
    [deckIds, searchParams, setSearchParams],
  );

  const deckMenuLabel = useMemo(() => {
    if (deckIds.length === 0) return "Todas as trilhas";
    if (deckIds.length === 1) {
      return decks.find((d) => d.id === deckIds[0])?.title ?? "1 trilha selecionada";
    }
    return `${deckIds.length} trilhas selecionadas`;
  }, [deckIds, decks]);

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

      // Modo adiantado: só prática -- não grava review nem mexe no
      // agendamento real do card (schedule()/due_at), só avança a sessão.
      if (cram) {
        setQueue((q) => q.filter((c) => c.id !== current.id));
        setDone((d) => ({ reviewed: d.reviewed + 1, correct: d.correct + (rating >= 3 ? 1 : 0) }));
        setSaving(false);
        advance();
        return;
      }

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
    [current, user, startedAt, setQueue, advance, cram],
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
      <SEO title="Estudar" description="Revise os flashcards que chegaram a hora de rever." path="/estudar" noindex />

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

      <div className="mb-6" ref={deckMenuRef}>
        <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">
          Trilhas
        </label>
        <div className="relative sm:w-64">
          <button
            type="button"
            onClick={() => setDeckMenuOpen((v) => !v)}
            aria-expanded={deckMenuOpen}
            className="flex w-full items-center justify-between rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
          >
            <span className="truncate">{deckMenuLabel}</span>
            <IconChevronDown className="h-4 w-4 shrink-0 text-slate-muted" />
          </button>
          {deckMenuOpen ? (
            <div className="absolute z-10 mt-1 w-full rounded-sm border border-hairline bg-elevated py-1 shadow-pop">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete("deck");
                  setSearchParams(params);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-paper hover:bg-surface"
              >
                Todas as trilhas
                {deckIds.length === 0 ? <IconCheck className="h-4 w-4 text-focus" /> : null}
              </button>
              <div className="my-1 border-t border-hairline" />
              {decks.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDeck(d.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-paper hover:bg-surface"
                >
                  <span className="truncate">{d.title}</span>
                  {deckIds.includes(d.id) ? (
                    <IconCheck className="h-4 w-4 shrink-0 text-focus" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {deckIds.length > 1 ? (
          <p className="mt-1 text-2xs text-slate-muted">Misturando cards das trilhas selecionadas.</p>
        ) : null}
        {cram ? (
          <p className="mt-2 text-2xs text-warn">
            Modo adiantado: praticar aqui não muda quando esses cards voltam a aparecer.{" "}
            <button
              type="button"
              onClick={() => setCram(false)}
              className="underline decoration-dotted underline-offset-2 hover:text-paper"
            >
              Sair do modo adiantado
            </button>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setCram(true)}
            className="mt-2 text-2xs text-slate-muted underline decoration-dotted underline-offset-2 hover:text-slate-soft"
          >
            Estudar adiantado (sem esperar a data)
          </button>
        )}
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
                className="press w-full rounded-sm bg-focus py-3 text-sm font-medium text-paper hover:bg-focus-deep"
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
              {showRatingExplainer ? (
                <div className="rounded-md border border-hairline bg-elevated p-4">
                  <h3 className="text-sm font-medium text-paper">{RATING_EXPLAINER.title}</h3>
                  <div className="mt-1.5">
                    <RatingExplainer onDismiss={dismissRatingExplainer} />
                  </div>
                </div>
              ) : (
                <p className="text-center text-2xs text-slate-muted">
                  Difícil, Bom e Fácil contam como acerto -- a diferença é só o quão fácil foi
                  lembrar.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RATINGS.map(({ rating, label, tone }) => (
                  <button
                    key={rating}
                    type="button"
                    disabled={saving}
                    onClick={() => void grade(rating)}
                    className={`press rounded-sm px-3 py-3 text-sm font-medium disabled:opacity-60 ${tone}`}
                  >
                    {label}
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
          title={cram ? "Prática concluída" : "Sessão concluida"}
          description={
            cram
              ? `Você praticou ${done.reviewed} cards com ${Math.round(
                  (done.correct / done.reviewed) * 100,
                )}% de acerto. Isso não muda quando eles voltam a aparecer no /estudar normal.`
              : `Você revisou ${done.reviewed} cards com ${Math.round(
                  (done.correct / done.reviewed) * 100,
                )}% de acerto. O Faro já atualizou seu painel.`
          }
          action={
            cram ? (
              <button
                type="button"
                onClick={() => setCram(false)}
                className="press inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
              >
                Voltar ao modo normal
              </button>
            ) : (
              <Link
                to="/painel"
                className="press inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
              >
                Ver painel
              </Link>
            )
          }
        />
      ) : (
        <EmptyState
          mood="yawning"
          title={cram ? "Nada pra praticar aqui" : "Nada pra revisar hoje"}
          description={
            cram
              ? "Essa trilha não tem cards disponíveis pra praticar (cards suspensos não entram)."
              : "O Faro não encontrou cards prontos para revisar agora. Gere novos cards ou estude adiantado."
          }
          action={
            cram ? (
              <Link
                to="/importar"
                className="press inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
              >
                Gerar cards
              </Link>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  to="/importar"
                  className="press inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
                >
                  Gerar cards
                </Link>
                <button
                  type="button"
                  onClick={() => setCram(true)}
                  className="press inline-block rounded-sm border border-hairline px-4 py-2 text-sm text-paper hover:border-focus"
                >
                  Estudar adiantado
                </button>
              </div>
            )
          }
        />
      )}
    </div>
  );
}
