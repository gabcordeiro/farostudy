/**
 * Modo Quiz: múltipla escolha gerada por IA a partir dos cards de uma trilha.
 * Cada resposta grava um review (rating 3 = acerto, 1 = erro) para alimentar
 * o painel de retenção. Toda bateria gerada e salva (quiz_sets) para poder
 * ser refeita sem gastar uma nova chamada de IA.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Mascot } from "@/components/Mascot";
import { ErrorModal } from "@/components/ErrorModal";
import { IconQuiz, IconRoute, IconTrophy } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { burst, celebrate } from "@/lib/confetti";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/useProfile";
import { useCredits } from "@/features/billing/useCredits";
import { useDecks } from "@/features/ai/useDecks";
import { type QuizChoice, type QuizItem } from "./generateQuiz";
import { useQuizSets } from "./useQuizSets";
import { useQuizGeneration } from "./QuizGenerationProvider";
import { QuizRunner } from "./QuizRunner";
import { createChallenge, submitAttempt } from "./quizChallenges";
import { useQuizChallengesEnabled } from "./useQuizChallengesFlag";

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

/** Trecho da 1a pergunta (sem HTML) para diferenciar baterias na lista. */
function quizPreview(items: QuizItem[]): string {
  const front = items[0]?.front ?? "";
  const text = front.replace(/<[^>]*>/g, "").trim();
  return text.length > 70 ? `${text.slice(0, 70)}…` : text;
}

export default function QuizPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { notify } = useToast();
  const navigate = useNavigate();
  const challengesEnabled = useQuizChallengesEnabled();
  const { decks, loading: decksLoading } = useDecks();
  const { balance } = useCredits();
  const [deckId, setDeckId] = useState("");
  const [count, setCount] = useState(10);
  const { sets: savedSets, loading: setsLoading, reload: reloadSets } = useQuizSets(deckId || undefined);
  const { generating, pendingResult, error: genError, start, consumeResult, clearError } =
    useQuizGeneration();

  const [error, setError] = useState<string | null>(null);
  const [needsCredits, setNeedsCredits] = useState(false);
  const [errorModal, setErrorModal] = useState<{ code: string | null } | null>(null);
  const [rawItems, setRawItems] = useState<(QuizItem & { deckId: string })[]>([]);
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [challenging, setChallenging] = useState(false);

  // "gerando" agora é global (sobrevive à navegação): a barra de progresso e
  // o esqueleto reaparecem ao voltar para /quiz no meio da geração.
  const busy = generating !== null;
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

  const startFrom = useCallback((source: QuizItem[], targetDeckId: string) => {
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
  }, []);

  // Quando a geração global termina, o resultado chega aqui: monta o quiz e
  // atualiza a lista de baterias salvas.
  useEffect(() => {
    if (!pendingResult) return;
    const r = consumeResult();
    if (r) {
      startFrom(r.items, r.deckId);
      if (r.deckId === deckId) reloadSets();
    }
  }, [pendingResult, consumeResult, startFrom, deckId, reloadSets]);

  // Erro da geração global -> reaproveita o mesmo tratamento de antes
  // (crédito insuficiente inline; qualquer outra falha vira o modal).
  useEffect(() => {
    if (!genError) return;
    if (genError.insufficientCredits) {
      setError("Créditos insuficientes para gerar o quiz.");
      setNeedsCredits(true);
    } else {
      setErrorModal({ code: genError.code });
    }
    clearError();
  }, [genError, clearError]);

  function handleStart() {
    setError(null);
    setNeedsCredits(false);
    if (!deckId) {
      setError("Selecione uma trilha.");
      return;
    }
    const deckTitle = decks.find((d) => d.id === deckId)?.title ?? "trilha";
    setItems([]);
    start({ deckId, deckTitle, count });
  }

  function handleRedoSaved(setItemsSrc: QuizItem[], targetDeckId: string) {
    setError(null);
    startFrom(setItemsSrc, targetDeckId);
    notify("Bateria carregada. Boa sorte!", "info");
  }

  function handleRedoCurrent() {
    startFrom(rawItems, rawItems[0]?.deckId ?? deckId);
  }

  /**
   * Cria um desafio a partir de uma bateria (atual ou salva) e navega pro
   * placar. `recordOwnScore` grava a nota que o criador acabou de tirar --
   * só faz sentido vindo da tela de "quiz concluído", não de uma bateria
   * salva que ele não acabou de responder agora.
   */
  async function handleChallenge(sourceItems: QuizItem[], targetDeckId: string, recordOwnScore: boolean) {
    if (!user || challenging) return;
    setChallenging(true);
    const deckTitle = decks.find((d) => d.id === targetDeckId)?.title ?? "trilha";
    const challengeId = await createChallenge({
      title: `Quiz de ${deckTitle}`,
      items: sourceItems,
      creatorId: user.id,
      creatorName: profile?.display_name ?? null,
    });
    if (!challengeId) {
      notify("Não foi possível criar o desafio.", "error");
      setChallenging(false);
      return;
    }
    if (recordOwnScore) {
      await submitAttempt({
        challengeId,
        userId: user.id,
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        score: score.correct,
        total: score.total,
        durationMs: null,
      });
    }
    setChallenging(false);
    navigate(`/desafio/${challengeId}`);
  }

  async function handleAnswer(choiceIdx: number) {
    if (!current || !user || answer !== null) return;
    setAnswer(choiceIdx);
    const chosen = current.shuffled[choiceIdx];
    const correct = chosen?.isCorrect === true;
    const rating = correct ? 3 : 1;

    if (correct) burst();
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
                disabled={!deckId || busy}
                className="press rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
              >
                {busy ? "Gerando..." : "Gerar novo quiz"}
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
                  {savedSets.map((s, i) => {
                    // Numero sequencial (a lista vem da mais nova para a mais
                    // antiga) + um trecho da 1a pergunta para diferenciar
                    // baterias que, senao, seriam todas "10 perguntas".
                    const num = savedSets.length - i;
                    const preview = quizPreview(s.items);
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-sm border border-hairline bg-elevated px-4 py-2.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-paper">Bateria {num}</span>
                            <span className="text-2xs text-slate-muted">
                              {s.itemCount} perguntas · {formatDate(s.createdAt)}
                            </span>
                          </span>
                          {preview ? (
                            <span className="mt-0.5 block truncate text-2xs text-slate-muted">
                              {preview}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {challengesEnabled ? (
                            <button
                              type="button"
                              disabled={challenging}
                              onClick={() => void handleChallenge(s.items, s.deckId, false)}
                              aria-label="Desafiar amigos com essa bateria"
                              title="Desafiar amigos"
                              className="press rounded-sm border border-hairline p-1.5 text-slate-muted hover:border-focus hover:text-paper disabled:opacity-60"
                            >
                              <IconTrophy className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleRedoSaved(s.items, s.deckId)}
                            className="press rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:border-focus hover:text-paper"
                          >
                            Refazer
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {busy ? (
        <div className="animate-fade-in space-y-3">
          <div className="flex items-center gap-3">
            <Mascot mood="searching" size="sm" alt="Faro farejando, preparando o quiz" />
            <p className="text-sm text-slate-muted">
              O Faro está preparando as perguntas
              {generating?.deckTitle ? (
                <>
                  {" "}de <span className="text-paper">"{generating.deckTitle}"</span>
                </>
              ) : null}
              ...
            </p>
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {current ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setItems([]);
                setRawItems([]);
              }}
              className="text-2xs text-slate-muted underline decoration-dotted underline-offset-2 hover:text-paper"
            >
              &larr; Sair
            </button>
            {challengesEnabled ? (
              <button
                type="button"
                disabled={challenging}
                onClick={() => void handleChallenge(rawItems, rawItems[0]?.deckId ?? deckId, false)}
                className="press inline-flex items-center gap-1.5 rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:border-focus hover:text-paper disabled:opacity-60"
              >
                <IconTrophy className="h-3.5 w-3.5" />
                {challenging ? "Criando..." : "Desafiar amigos"}
              </button>
            ) : null}
          </div>
          <QuizRunner
            current={current}
            index={index}
            total={items.length}
            score={score}
            answer={answer}
            onAnswer={(i) => void handleAnswer(i)}
            onNext={next}
            isLast={isLast}
          />
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
              <button
                type="button"
                disabled={challenging}
                onClick={() =>
                  void handleChallenge(
                    rawItems,
                    rawItems[0]?.deckId ?? deckId,
                    true,
                  )
                }
                className="press inline-flex items-center gap-1.5 rounded-sm border border-hairline px-4 py-2 text-sm text-paper hover:border-focus disabled:opacity-60"
              >
                <IconTrophy className="h-4 w-4" />
                {challenging ? "Criando..." : "Desafiar amigos"}
              </button>
            </div>
          }
        />
      ) : null}

      <ErrorModal open={errorModal !== null} code={errorModal?.code} onClose={() => setErrorModal(null)} />
    </div>
  );
}
