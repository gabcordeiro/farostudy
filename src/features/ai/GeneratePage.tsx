/**
 * Geracao de cards com IA (Gemini via edge function).
 * Cola texto ou JSON, escolhe (ou cria) a trilha e o Faro devolve os flashcards.
 * Upload de .apkg fica como proximo passo (parsing do pacote Anki no backend).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { renderCardHtml } from "@/lib/sanitize";
import { IconRoute, IconWand } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { useDecks } from "./useDecks";
import { generateCards, type GenerateResult } from "./generateCards";

type Mode = "text" | "json";
const NEW_DECK_VALUE = "__new__";

export default function GeneratePage() {
  const { decks, loading: decksLoading, createDeck } = useDecks();
  const { notify, dismiss } = useToast();
  const [deckId, setDeckId] = useState("");
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [mode, setMode] = useState<Mode>("text");
  const [content, setContent] = useState("");
  const [maxCards, setMaxCards] = useState(20);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [resultDeckId, setResultDeckId] = useState<string | null>(null);

  function handleDeckSelect(value: string) {
    if (value === NEW_DECK_VALUE) {
      setCreatingDeck(true);
      setDeckId("");
    } else {
      setCreatingDeck(false);
      setDeckId(value);
    }
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
    const progressId = notify("O Faro esta lendo seu conteudo e montando os cards...", "info", 0);
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
            Cole um texto ou um JSON e a IA monta os flashcards na sua trilha.
          </p>
        </div>
      </header>

      <div className="space-y-5 rounded-md border border-hairline bg-elevated p-5">
        {/* Trilha */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm text-slate-soft">Trilha</label>
            <Link
              to="/trilhas"
              className="inline-flex items-center gap-1 text-2xs text-slate-muted hover:text-paper"
            >
              <IconRoute className="h-3.5 w-3.5" />
              Gerenciar trilhas
            </Link>
          </div>
          {decksLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <select
              value={creatingDeck ? NEW_DECK_VALUE : deckId}
              onChange={(e) => handleDeckSelect(e.target.value)}
              className="w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
            >
              <option value="">Selecione uma trilha...</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
              <option value={NEW_DECK_VALUE}>+ Criar nova trilha...</option>
            </select>
          )}
          {creatingDeck ? (
            <input
              autoFocus
              value={newDeckTitle}
              onChange={(e) => setNewDeckTitle(e.target.value)}
              placeholder="Nome da nova trilha (ex: Legislacao)"
              maxLength={160}
              className="mt-2 w-full animate-fade-in rounded-sm border border-focus bg-surface px-3 py-2 text-sm text-paper outline-none"
            />
          ) : null}
        </div>

        {/* Modo + quantidade */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-soft">Entrada</label>
            <div className="inline-flex overflow-hidden rounded-sm border border-hairline">
              {(["text", "json"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 text-sm ${
                    mode === m ? "bg-focus text-paper" : "bg-surface text-slate-soft"
                  }`}
                >
                  {m === "text" ? "Texto" : "JSON"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-soft">Maximo de cards</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxCards}
              onChange={(e) => setMaxCards(Number(e.target.value))}
              className="w-24 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
            />
          </div>
        </div>

        {/* Conteudo */}
        <div>
          <label className="mb-1 block text-sm text-slate-soft">
            {mode === "text" ? "Texto de origem" : "JSON de origem"}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            maxLength={50000}
            placeholder={
              mode === "text"
                ? "Cole aqui o trecho do edital, resumo ou materia..."
                : '[{"conceito":"...","definicao":"..."}]'
            }
            className="w-full resize-y rounded-sm border border-hairline bg-surface px-3 py-2 font-mono text-sm text-paper outline-none focus:border-focus"
          />
          <p className="mt-1 text-2xs text-slate-muted">{content.length}/50000</p>
        </div>

        {error ? (
          <p role="alert" className="rounded-sm border border-bad/40 bg-bad/10 px-3 py-2 text-2xs text-bad">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
        >
          <IconWand className="h-[18px] w-[18px]" />
          {busy ? "Gerando..." : "Gerar cards"}
        </button>
      </div>

      {/* Resultado */}
      {busy ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
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
                  // Conteudo passado por escape seguro (anti-XSS #15).
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
