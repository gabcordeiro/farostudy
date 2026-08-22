/**
 * Geração de cards com IA (Gemini via edge function).
 * Cola texto ou JSON, escolhe (ou cria) a trilha e o Faro devolve os flashcards.
 * Upload de .apkg fica como próximo passo (parsing do pacote Anki no backend).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { Mascot } from "@/components/Mascot";
import { renderCardHtml } from "@/lib/sanitize";
import { IconPlus, IconRoute, IconWand } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { AppFunctionError } from "@/lib/functionError";
import { useCredits } from "@/features/billing/useCredits";
import { useDecks } from "./useDecks";
import { generateCards, type GenerateResult } from "./generateCards";

type Mode = "text" | "json";

export default function GeneratePage() {
  const { decks, loading: decksLoading, createDeck } = useDecks();
  const { balance } = useCredits();
  const { notify, dismiss } = useToast();
  const [deckId, setDeckId] = useState("");
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [mode, setMode] = useState<Mode>("text");
  const [content, setContent] = useState("");
  const [maxCards, setMaxCards] = useState(20);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsCredits, setNeedsCredits] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [resultDeckId, setResultDeckId] = useState<string | null>(null);

  // Fechar a aba nao cancela a geracao no servidor (o credito ja foi
  // debitado e os cards sao inseridos direto pela edge function), mas o
  // usuario perde a confirmacao na tela. Avisa antes de sair sem querer.
  useEffect(() => {
    if (!busy) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  function handleDeckSelect(value: string) {
    setDeckId(value);
  }

  async function ensureDeck(): Promise<string | null> {
    if (deckId) return deckId;
    if (creatingDeck && newDeckTitle.trim()) {
      const created = await createDeck(newDeckTitle);
      if (created) {
        setDeckId(created.id);
        setCreatingDeck(false);
        return created.id;
      }
    }
    return null;
  }

  async function handleGenerate() {
    setError(null);
    setNeedsCredits(false);
    setResult(null);
    if (content.trim().length < 1) {
      setError("Cole um texto ou JSON para gerar os cards.");
      return;
    }
    const targetDeck = await ensureDeck();
    if (!targetDeck) {
      setError("Escolha uma trilha existente ou crie uma nova.");
      return;
    }
    setBusy(true);
    const progressId = notify("O Faro esta lendo seu conteúdo e montando os cards...", "info", 0);
    try {
      const res = await generateCards({ deckId: targetDeck, mode, content, maxCards });
      setResult(res);
      setResultDeckId(targetDeck);
      dismiss(progressId);
      notify(
        res.created > 0 ? `${res.created} cards criados com sucesso.` : "Nenhum card foi gerado desta vez.",
        res.created > 0 ? "success" : "error",
      );
    } catch (err) {
      const message = (err as Error).message ?? "Falha ao gerar os cards.";
      setError(message);
      if (err instanceof AppFunctionError && err.insufficientCredits) setNeedsCredits(true);
      dismiss(progressId);
      notify(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SEO
        title="Gerar cards com IA"
        description="Transforme textos e editais em flashcards com o Faro Study."
        path="/importar"
        noindex
      />

      <header className="mb-6 flex items-center gap-3">
        <IconWand className="h-6 w-6 text-focus-soft" title="Gerar" />
        <div>
          <h1 className="font-display text-2xl text-paper">Gerar cards com IA</h1>
          <p className="text-sm text-slate-muted">
            Cole um texto e a IA monta os flashcards na sua trilha.
          </p>
        </div>
      </header>

      <div className="space-y-5 rounded-md border border-hairline bg-elevated p-5">
        {/* Trilha + Máximo de cards: mesma linha -- são a configuração rápida
            antes da tarefa principal (o texto), não merecem o mesmo peso dela. */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm text-slate-soft">Trilha</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCreatingDeck(true);
                    setDeckId("");
                  }}
                  className="inline-flex items-center gap-1 text-2xs text-slate-muted transition-colors duration-150 hover:text-paper"
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  Nova trilha
                </button>
                <Link
                  to="/trilhas"
                  className="inline-flex items-center gap-1 text-2xs text-slate-muted transition-colors duration-150 hover:text-paper"
                >
                  <IconRoute className="h-3.5 w-3.5" />
                  Gerenciar trilhas
                </Link>
              </div>
            </div>
            {creatingDeck ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="Nome da nova trilha (ex: Legislacao)"
                  maxLength={160}
                  className="w-full animate-fade-in rounded-sm border border-focus bg-surface px-3 py-2 text-sm text-paper outline-none transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCreatingDeck(false);
                    setNewDeckTitle("");
                  }}
                  className="shrink-0 text-2xs text-slate-muted transition-colors duration-150 hover:text-paper"
                >
                  Cancelar
                </button>
              </div>
            ) : decksLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <select
                value={deckId}
                onChange={(e) => handleDeckSelect(e.target.value)}
                className="w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none transition-colors duration-150 focus:border-focus"
              >
                <option value="">Selecione uma trilha...</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-soft">Máximo de cards</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxCards}
              onChange={(e) => setMaxCards(Number(e.target.value))}
              className="w-24 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none transition-colors duration-150 focus:border-focus"
            />
          </div>
        </div>

        {/* Conteúdo */}
        <div>
          <label className="mb-1 block text-sm text-slate-soft">
            {mode === "text" ? "Texto de origem" : "JSON de origem"}
          </label>
          {mode === "json" ? (
            <p className="mb-1 text-2xs text-slate-muted">
              Formato para colar uma lista de perguntas e respostas já estruturada
              (exportada de outra ferramenta). Se não souber o que é isso, use o modo
              texto normal.
            </p>
          ) : null}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            maxLength={50000}
            placeholder={
              mode === "text"
                ? "Cole aqui o trecho do edital, resumo ou matéria..."
                : '[{"conceito":"...","definicao":"..."}]'
            }
            className="w-full resize-y rounded-sm border border-hairline bg-surface px-3 py-2 font-mono text-sm text-paper outline-none transition-colors duration-150 focus:border-focus"
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-2xs text-slate-muted">{content.length}/50000</p>
            <button
              type="button"
              onClick={() => setMode(mode === "text" ? "json" : "text")}
              className="text-2xs text-slate-muted underline decoration-dotted underline-offset-2 transition-colors duration-150 hover:text-slate-soft"
            >
              {mode === "text" ? "Colar uma lista já pronta (avançado)" : "‹ Voltar para texto"}
            </button>
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
            onClick={handleGenerate}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 transition-all duration-150 hover:bg-action-deep active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100"
          >
            <IconWand className="h-[18px] w-[18px]" />
            {busy ? "Gerando..." : "Gerar cards"}
          </button>
        </div>
      </div>

      {/* Resultado */}
      {busy ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3">
            <Mascot mood="searching" size="sm" alt="Faro farejando, gerando seus cards" />
            <p className="text-sm text-slate-muted">O Faro está montando seus cards...</p>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      ) : null}

      {result ? (
        <section className="mt-6 animate-rise-in">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg text-paper">{result.created} cards criados</h2>
            {resultDeckId ? (
              <Link
                to={`/trilhas/${resultDeckId}`}
                className="text-2xs text-action underline underline-offset-2"
              >
                Ver na trilha
              </Link>
            ) : null}
          </div>
          <ul className="space-y-2">
            {result.cards.map((c) => (
              <li
                key={c.id}
                className="rounded-sm border border-hairline bg-elevated p-3 text-sm"
              >
                <p
                  className="text-paper"
                  // Conteúdo passado por escape seguro (anti-XSS #15).
                  dangerouslySetInnerHTML={{ __html: renderCardHtml(c.front) }}
                />
                <p
                  className="mt-1 text-slate-muted"
                  dangerouslySetInnerHTML={{ __html: renderCardHtml(c.back) }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
