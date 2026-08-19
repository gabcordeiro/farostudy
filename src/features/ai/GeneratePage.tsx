/**
 * Geracao de cards com IA (Gemini via edge function).
 * Cola texto ou JSON, escolhe a trilha e o Faro devolve os flashcards.
 * Upload de .apkg fica como proximo passo (parsing do pacote Anki no backend).
 */
import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { renderCardHtml } from "@/lib/sanitize";
import { IconWand } from "@/components/icons";
import { useDecks } from "./useDecks";
import { generateCards, type GenerateResult } from "./generateCards";

type Mode = "text" | "json";

export default function GeneratePage() {
  const { decks, loading: decksLoading, createDeck } = useDecks();
  const [deckId, setDeckId] = useState("");
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [mode, setMode] = useState<Mode>("text");
  const [content, setContent] = useState("");
  const [maxCards, setMaxCards] = useState(20);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

  async function ensureDeck(): Promise<string | null> {
    if (deckId) return deckId;
    if (newDeckTitle.trim()) {
      const created = await createDeck(newDeckTitle);
      if (created) {
        setDeckId(created.id);
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
      setError("Escolha uma trilha existente ou informe um nome para criar uma.");
      return;
    }
    setBusy(true);
    try {
      const res = await generateCards({ deckId: targetDeck, mode, content, maxCards });
      setResult(res);
    } catch (err) {
      setError((err as Error).message ?? "Falha ao gerar os cards.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SEO
        title="Gerar cards com IA"
        description="Transforme textos e editais em flashcards com o Faro Cards."
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

      <div className="space-y-5 rounded-md border border-slate-border bg-ink-700 p-5">
        {/* Trilha */}
        <div>
          <label className="mb-1 block text-sm text-slate-soft">Trilha</label>
          {decksLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : decks.length > 0 ? (
            <select
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className="w-full rounded-sm border border-slate-border bg-ink-800 px-3 py-2 text-sm text-paper outline-none focus:border-focus"
            >
              <option value="">Selecione uma trilha...</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={newDeckTitle}
              onChange={(e) => setNewDeckTitle(e.target.value)}
              placeholder="Nome da nova trilha (ex: Legislacao)"
              className="w-full rounded-sm border border-slate-border bg-ink-800 px-3 py-2 text-sm text-paper outline-none focus:border-focus"
            />
          )}
        </div>

        {/* Modo + quantidade */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-soft">Entrada</label>
            <div className="inline-flex overflow-hidden rounded-sm border border-slate-border">
              {(["text", "json"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 text-sm ${
                    mode === m ? "bg-focus text-paper" : "bg-ink-800 text-slate-soft"
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
              className="w-24 rounded-sm border border-slate-border bg-ink-800 px-3 py-2 text-sm text-paper outline-none focus:border-focus"
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
            className="w-full resize-y rounded-sm border border-slate-border bg-ink-800 px-3 py-2 font-mono text-sm text-paper outline-none focus:border-focus"
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
        <section className="mt-6">
          <h2 className="mb-3 font-display text-lg text-paper">
            {result.created} cards criados
          </h2>
          <ul className="space-y-2">
            {result.cards.map((c) => (
              <li
                key={c.id}
                className="rounded-sm border border-slate-border bg-ink-700 p-3 text-sm"
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
