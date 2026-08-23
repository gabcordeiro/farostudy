/**
 * Modo Quiz: múltipla escolha gerada por IA a partir dos cards de uma trilha.
 * Cada resposta grava um review (rating 3 = acerto, 1 = erro) para alimentar
 * o painel de retenção. Toda bateria gerada e salva (quiz_sets) para poder
 * ser refeita sem gastar uma nova chamada de IA.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Mascot } from "@/components/Mascot";
import { ErrorModal } from "@/components/ErrorModal";
import { IconCheck, IconClose, IconQuiz, IconRoute } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { celebrate } from "@/lib/confetti";
import { renderCardHtml } from "@/lib/sanitize";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCredits } from "@/features/billing/useCredits";
import { useGeneration } from "@/features/generation/GenerationProvider";
import { useDecks } from "@/features/ai/useDecks";
import { type QuizChoice, type QuizItem } from "./generateQuiz";
import { useQuizSets } from "./useQuizSets";

const LETTERS = ["A", "B", "C", "D"];

interface DisplayItem extends QuizItem {
  deckId: string;
  categoryId: string | null;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function QuizPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { decks, loading: decksLoading } = useDecks();
  const { balance } = useCredits();
  // A geração roda no provider global: sobrevive à troca de menu e mantém o
  // status na bandeja/badges. A página dispara, observa o job e, quando fica
  // pronto, monta a bateria a partir dele (mesmo se o usuário saiu e voltou).
  const { startQuiz, jobs } = useGeneration();
  const location = useLocation();
  const navigate = useNavigate();
  const [deckId, setDeckId] = useState("");
  const [count, setCount] = useState(10);
  const { sets: savedSets, loading: setsLoading, reload: reloadSets } = useQuizSets(deckId || undefined);

  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsCredits, setNeedsCredits] = useState(false);
  const [errorModal, setErrorModal] = useState<{ code: string | null } | null>(null);
  const [rawItems, setRawItems] = useState<(QuizItem & { deckId: string })[]>([]);
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  // Garante que um job pronto só vira bateria uma vez (evita reinício a cada render).
  const consumedJobRef = useRef<string | null>(null);

  const job = useMemo(() => jobs.find((j) => j.id === jobId) ?? null, [jobs, jobId]);
  const busy = job?.status === "running";

  const current = items[index];
  const isLast = current && index === items.length - 1;
  const quizFinished = !current && items.length > 0 && !busy;

  // Confete só na transição pra "concluido" -- o boolean como dependencia
  // garante que dispara uma vez por bateria terminada, não a cada render.
  useEffect(() => {
    if (quizFinished) celebrate();
  }, [quizFinished]);

  function startFrom(source: QuizItem[], targetDeckId: string) {
    const built: DisplayItem[] = source.map((it) => ({
      ...it,
      deckId: targetDeckId,
      categoryId: null,
      shuffled: shuffle(it.choices),
    }));
    setRawItems(source.map((it) => ({ ...it, deckId: targetDeckId })));
    setItems(built);
    setIndex(0);
    setAnswer(null);
    setScore({ correct: 0, total: 0 });
  }

  // Reage ao desfecho do job iniciado nesta página. Pronto -> monta a bateria
  // e recarrega a lista de salvas (o provider já gravou em quiz_sets). Erro ->
  // aviso inline (créditos) ou modal genérico, igual ao fluxo antigo.
  useEffect(() => {
    if (!job) return;
    if (job.status === "done" && job.quiz && consumedJobRef.current !== job.id) {
      consumedJobRef.current = job.id;
      startFrom(job.quiz.items, job.deckId);
      void reloadSets();
    } else if (job.status === "error") {
      if (job.insufficientCredits) {
        setError(job.errorMessage ?? "Créditos insuficientes.");
        setNeedsCredits(true);
      } else {
        setErrorModal({ code: job.errorCode ?? null });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, job?.id]);

  // Ação "Abrir quiz" da bandeja: chega via state da navegação. Seleciona a
  // trilha do job e começa a bateria já gerada, sem custar outra chamada de IA.
  useEffect(() => {
    const playId = (location.state as { playQuizJobId?: string } | null)?.playQuizJobId;
    if (!playId) return;
    const j = jobs.find((x) => x.id === playId);
    if (j?.quiz && consumedJobRef.current !== j.id) {
      consumedJobRef.current = j.id;
      setJobId(j.id);
      setDeckId(j.deckId);
      startFrom(j.quiz.items, j.deckId);
    }
    // Limpa o state para um refresh não reabrir a mesma bateria.
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  function handleStart() {
    setError(null);
    setNeedsCredits(false);
    if (!deckId) {
      setError("Selecione uma trilha.");
      return;
    }
    setItems([]);
    setRawItems([]);
    const title = decks.find((d) => d.id === deckId)?.title ?? "sua trilha";
    const id = startQuiz({ deckId, count }, title);
    setJobId(id);
  }

  function handleRedoSaved(setItemsSrc: QuizItem[], targetDeckId: string) {
    setError(null);
    startFrom(setItemsSrc, targetDeckId);
    notify("Bateria carregada. Boa sorte!", "info");
  }

  function handleRedoCurrent() {
    startFrom(rawItems, rawItems[0]?.deckId ?? deckId);
  }

  async function handleAnswer(choiceIdx: number) {
    if (!current || !user || answer !== null) return;
    setAnswer(choiceIdx);
    const chosen = current.shuffled[choiceIdx];
    const correct = chosen?.isCorrect === true;
    const rating = correct ? 3 : 1;

    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));

    // Grava review sem mexer em cards.due_at (isso é trabalho do /estudar).
    await withJwtRetry(() =>
      supabase.from("reviews").insert({
        user_id: user.id,
        card_id: current.cardId,
        deck_id: current.deckId,
        category_id: current.categoryId,
        rating,
      }),
    );
  }

  function next() {
    setAnswer(null);
    setIndex((i) => i + 1);
  }

  const progress = useMemo(
    () => (items.length ? `Pergunta ${Math.min(index + 1, items.length)} de ${items.length}` : ""),
    [index, items.length],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <SEO title="Quiz" description="Quiz de múltipla escolha gerado por IA." path="/quiz" noindex />

      <header className="mb-6 flex items-center gap-3">
        <IconQuiz className="h-6 w-6 text-focus-soft" title="Quiz" />
        <div>
          <h1 className="font-display text-2xl text-paper">Quiz</h1>
          <p className="text-sm text-slate-muted">
            Múltipla escolha a partir dos cards de uma trilha.
          </p>
        </div>
      </header>

      {items.length === 0 && !busy ? (
        <div className="space-y-5">
          <div className="space-y-4 rounded-md border border-hairline bg-elevated p-5">
            {/* Trilha + Número de perguntas: mesma linha, mesmo padrão do
                cabeçalho de campo usado em Gerar (label + link de gestão). */}
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm text-slate-soft">Trilha</label>
                  <Link
                    to="/trilhas"
                    className="inline-flex items-center gap-1 text-2xs text-slate-muted transition-colors duration-150 hover:text-paper"
                  >
                    <IconRoute className="h-3.5 w-3.5" />
                    Gerenciar trilhas
                  </Link>
                </div>
                {decksLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : decks.length > 0 ? (
                  <select
                    value={deckId}
                    onChange={(e) => {
                      // Trocar de trilha manualmente descarta a fila em andamento.
                      setDeckId(e.target.value);
                      setItems([]);
                      setRawItems([]);
                    }}
                    className="w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
                  >
                    <option value="">Selecione uma trilha...</option>
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-slate-muted">
                    Você ainda não tem trilhas.{" "}
                    <Link to="/importar" className="text-action underline underline-offset-2">
                      Crie uma
                    </Link>{" "}
                    para começar.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-soft">Número de perguntas</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-24 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
                />
                <p className="mt-1 text-2xs text-slate-muted">Entre 1 e 20.</p>
              </div>
            </div>

            {error ? (
              <p role="alert" className="rounded-sm border border-bad/40 bg-bad/10 px-3 py-2 text-2xs text-bad">
                {error}
                {needsCredits ? (
                  <>
                    {" "}
                    <Link to="/planos" className="underline underline-offset-2">
                      Ver planos
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}

            <div>
              <p className={`mb-2 text-2xs ${balance === 0 ? "text-warn" : "text-slate-muted"}`}>
                Essa geração usa 1 crédito
                {balance !== null ? ` · você tem ${balance} ${balance === 1 ? "crédito" : "créditos"}` : ""}
                {balance === 0 ? (
                  <>
                    {" "}
                    <Link to="/planos" className="underline underline-offset-2">
                      Ver planos
                    </Link>
                  </>
                ) : null}
              </p>
              <button
                type="button"
                onClick={handleStart}
                disabled={!deckId}
                className="press rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
              >
                Gerar novo quiz
              </button>
            </div>
          </div>

          {deckId ? (
            <div>
              <p className="mb-2 text-2xs uppercase tracking-wider text-slate-muted">
                Baterias salvas dessa trilha
              </p>
              {setsLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : savedSets.length === 0 ? (
                <p className="text-sm text-slate-muted">Nenhuma bateria salva ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {savedSets.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-sm border border-hairline bg-elevated px-4 py-2.5"
                    >
                      <span className="text-sm text-paper">
                        {s.itemCount} perguntas
                        <span className="ml-2 text-2xs text-slate-muted">{formatDate(s.createdAt)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRedoSaved(s.items, s.deckId)}
                        className="press rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:border-focus hover:text-paper"
                      >
                        Refazer
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {busy ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mascot mood="searching" size="sm" alt="Faro farejando, preparando o quiz" />
            <p className="text-sm text-slate-muted">O Faro está preparando as perguntas...</p>
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {current ? (
        <div key={current.cardId} className="animate-rise-in space-y-4">
          {/* Progresso + placar corrente */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <p className="text-2xs uppercase tracking-wider text-slate-muted">{progress}</p>
              <p className="text-2xs text-slate-muted">
                Placar <span className="font-mono text-paper">{score.correct}/{score.total}</span>
              </p>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-sm bg-surface">
              <div
                className="h-full bg-focus transition-all duration-300"
                style={{ width: `${((index + (answer !== null ? 1 : 0)) / items.length) * 100}%` }}
              />
            </div>
          </div>

          <article className="rounded-md border border-hairline bg-elevated px-5 py-6">
            <p className="mb-2 text-2xs uppercase tracking-wider text-focus-soft">Pergunta</p>
            <div
              className="text-xl leading-relaxed text-paper"
              dangerouslySetInnerHTML={{ __html: renderCardHtml(current.front) }}
            />
          </article>

          <ul className="space-y-2">
            {current.shuffled.map((ch, i) => {
              const chosen = answer === i;
              const revealed = answer !== null;
              const isRight = ch.isCorrect;
              const tone = !revealed
                ? "border-hairline hover:border-focus"
                : isRight
                  ? "border-good bg-good/10"
                  : chosen
                    ? "border-bad bg-bad/10"
                    : "border-hairline opacity-60";
              const badgeTone = !revealed
                ? "border-hairline text-slate-muted"
                : isRight
                  ? "border-good text-good"
                  : chosen
                    ? "border-bad text-bad"
                    : "border-hairline text-slate-muted";
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={revealed}
                    onClick={() => void handleAnswer(i)}
                    className={`press flex w-full items-center gap-3 rounded-sm border bg-elevated px-4 py-3 text-left text-sm text-paper ${tone}`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border font-mono text-2xs ${badgeTone}`}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className="flex-1">{ch.text}</span>
                    {revealed && isRight ? (
                      <IconCheck className="h-4 w-4 shrink-0 text-good" title="Resposta correta" />
                    ) : revealed && chosen ? (
                      <IconClose className="h-4 w-4 shrink-0 text-bad" title="Resposta errada" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {answer !== null ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={next}
                className="press rounded-sm bg-focus px-4 py-2 text-sm font-medium text-paper hover:bg-focus-deep"
              >
                {isLast ? "Ver resultado" : "Próxima"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {quizFinished ? (
        <EmptyState
          mood="winking"
          title="Quiz concluido"
          description={`Você acertou ${score.correct} de ${score.total}. Os resultados já foram para o seu painel.`}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                to="/painel"
                className="press inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
              >
                Ver painel
              </Link>
              <button
                type="button"
                onClick={handleRedoCurrent}
                className="press inline-block rounded-sm border border-hairline px-4 py-2 text-sm text-paper hover:border-focus"
              >
                Refazer essa bateria
              </button>
            </div>
          }
        />
      ) : null}

      <ErrorModal open={errorModal !== null} code={errorModal?.code} onClose={() => setErrorModal(null)} />
    </div>
  );
}
