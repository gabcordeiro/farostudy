/**
 * Modo Quiz: múltipla escolha gerada por IA a partir dos cards de uma trilha.
 * Cada resposta grava um review (rating 3 = acerto, 1 = erro) para alimentar
 * o painel de retenção. Toda bateria gerada e salva (quiz_sets) para poder
 * ser refeita sem gastar uma nova chamada de IA.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Mascot } from "@/components/Mascot";
import { IconCheck, IconClose, IconQuiz, IconRoute } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { AppFunctionError } from "@/lib/functionError";
import { celebrate } from "@/lib/confetti";
import { renderCardHtml } from "@/lib/sanitize";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCredits } from "@/features/billing/useCredits";
import { useDecks } from "@/features/ai/useDecks";
import { generateQuiz, type QuizChoice, type QuizItem } from "./generateQuiz";
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
  const { notify, dismiss } = useToast();
  const { decks, loading: decksLoading } = useDecks();
  const { balance } = useCredits();
  const [deckId, setDeckId] = useState("");
  const [count, setCount] = useState(10);
  const { sets: savedSets, loading: setsLoading, save: saveSet } = useQuizSets(deckId || undefined);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsCredits, setNeedsCredits] = useState(false);
  const [rawItems, setRawItems] = useState<(QuizItem & { deckId: string })[]>([]);
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const current = items[index];
  const isLast = current && index === items.length - 1;
  const quizFinished = !current && items.length > 0 && !busy;

  // Confete só na transição pra "concluido" -- o boolean como dependencia
  // garante que dispara uma vez por bateria terminada, não a cada render.
  useEffect(() => {
    if (quizFinished) celebrate();
  }, [quizFinished]);

  // Fechar a aba durante a geracao nao cancela a chamada no servidor -- o
  // credito ja foi debitado -- mas o quiz gerado nunca chega a ser salvo
  // (isso so acontece no retorno da funcao, aqui no cliente). Avisa antes.
  useEffect(() => {
    if (!busy) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  // Se o usuário trocar de trilha, esconde a fila de perguntas em andamento.
  useEffect(() => {
    setItems([]);
    setRawItems([]);
  }, [deckId]);

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

  async function handleStart() {
    setError(null);
    setNeedsCredits(false);
    if (!deckId) {
      setError("Selecione uma trilha.");
      return;
    }
    setBusy(true);
    setItems([]);
    const progressId = notify("O Faro esta preparando as perguntas do quiz...", "info", 0);
    try {
      const res = await generateQuiz({ deckId, count });
      dismiss(progressId);
      if (res.items.length === 0) {
        setError("O Faro não conseguiu montar o quiz agora. Tente outra trilha.");
        notify("Não foi possível montar o quiz.", "error");
      } else {
        startFrom(res.items, deckId);
        void saveSet(deckId, res.items);
        notify(`Quiz com ${res.items.length} perguntas pronto e salvo.`, "success");
      }
    } catch (err) {
      dismiss(progressId);
      const message = (err as Error).message ?? "Falha ao gerar o quiz.";
      setError(message);
      if (err instanceof AppFunctionError && err.insufficientCredits) setNeedsCredits(true);
      notify(message, "error");
    } finally {
      setBusy(false);
    }
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
                    onChange={(e) => setDeckId(e.target.value)}
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
                className="rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
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
                        className="rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:border-focus hover:text-paper"
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
        <div className="space-y-4">
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
                    className={`flex w-full items-center gap-3 rounded-sm border bg-elevated px-4 py-3 text-left text-sm text-paper transition-colors duration-150 ${tone}`}
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
              {isLast ? (
                <Link
                  to="/painel"
                  className="rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
                >
                  Ver painel
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="rounded-sm bg-focus px-4 py-2 text-sm font-medium text-paper hover:bg-focus-deep"
                >
                  Próxima
                </button>
              )}
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
            <button
              type="button"
              onClick={handleRedoCurrent}
              className="inline-block rounded-sm bg-focus px-4 py-2 text-sm font-medium text-paper hover:bg-focus-deep"
            >
              Refazer essa bateria
            </button>
          }
        />
      ) : null}
    </div>
  );
}
