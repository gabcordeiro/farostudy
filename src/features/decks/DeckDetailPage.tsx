/**
 * Detalhe de uma trilha: renomear, ver/editar/excluir cards.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { IconPencil, IconTrash } from "@/components/icons";
import { renderCardHtml } from "@/lib/sanitize";
import { cardEditSchema, deckTitleSchema } from "@/lib/validation";
import { useDeckDetail, type DeckCardRow } from "./useDeckDetail";

function CardEditor({
  card,
  onCancel,
  onSave,
}: {
  card: DeckCardRow;
  onCancel: () => void;
  onSave: (patch: { front: string; back: string; hint?: string | null }) => Promise<void>;
}) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [hint, setHint] = useState(card.hint ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const parsed = cardEditSchema.safeParse({ front, back, hint: hint || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados invalidos");
      return;
    }
    setSaving(true);
    await onSave(parsed.data);
    setSaving(false);
  }

  return (
    <div className="space-y-3 rounded-md border border-focus bg-elevated p-4 animate-fade-in">
      <div>
        <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">Frente</label>
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          rows={2}
          maxLength={8000}
          className="w-full resize-y rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
        />
      </div>
      <div>
        <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">Verso</label>
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          rows={3}
          maxLength={8000}
          className="w-full resize-y rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
        />
      </div>
      <div>
        <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">Dica (opcional)</label>
        <input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          maxLength={2000}
          className="w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
        />
      </div>
      {error ? <p className="text-2xs text-bad">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-sm bg-focus px-4 py-1.5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-focus-deep disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border border-hairline px-4 py-1.5 text-sm text-slate-soft transition-colors duration-150 hover:text-paper"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { title, cards, loading, error, notFound, renameDeck, updateCard, deleteCard } = useDeckDetail(deckId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  useEffect(() => setTitleValue(title), [title]);

  useEffect(() => {
    if (notFound) navigate("/trilhas", { replace: true });
  }, [notFound, navigate]);

  async function handleTitleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = deckTitleSchema.safeParse(titleValue);
    if (!parsed.success) {
      setTitleError(parsed.error.issues[0]?.message ?? "Titulo invalido");
      return;
    }
    setTitleError(null);
    const ok = await renameDeck(parsed.data);
    if (ok) setEditingTitle(false);
  }

  async function handleDeleteCard(id: string) {
    if (deletingCardId !== id) {
      setDeletingCardId(id);
      return;
    }
    await deleteCard(id);
    setDeletingCardId(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SEO title={title || "Trilha"} description="Cards da trilha." path="/trilhas" noindex />

      <Link to="/trilhas" className="mb-4 inline-block text-2xs text-slate-muted hover:text-paper">
        &larr; Todas as trilhas
      </Link>

      <header className="mb-6">
        {loading ? (
          <Skeleton className="h-8 w-64" />
        ) : editingTitle ? (
          <form onSubmit={handleTitleSubmit} className="flex flex-wrap items-center gap-2">
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              maxLength={160}
              className="rounded-sm border border-focus bg-surface px-3 py-1.5 text-xl text-paper outline-none"
            />
            <button
              type="submit"
              className="rounded-sm bg-focus px-3 py-1.5 text-2xs font-medium text-paper hover:bg-focus-deep"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTitle(false);
                setTitleValue(title);
                setTitleError(null);
              }}
              className="rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:text-paper"
            >
              Cancelar
            </button>
            {titleError ? <p className="w-full text-2xs text-bad">{titleError}</p> : null}
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl text-paper">{title}</h1>
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              aria-label="Renomear trilha"
              className="rounded-sm p-1.5 text-slate-muted transition-colors duration-150 hover:bg-elevated hover:text-paper"
            >
              <IconPencil className="h-4 w-4" />
            </button>
          </div>
        )}
        <p className="mt-1 text-sm text-slate-muted">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </p>
      </header>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      ) : cards.length === 0 ? (
        <EmptyState
          mood="sleepy"
          title="Nenhum card nessa trilha"
          description="Gere cards com IA ou crie manualmente para comecar."
          action={
            <Link
              to="/importar"
              className="inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
            >
              Gerar cards
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {cards.map((c) =>
            editingCardId === c.id ? (
              <li key={c.id}>
                <CardEditor
                  card={c}
                  onCancel={() => setEditingCardId(null)}
                  onSave={async (patch) => {
                    const ok = await updateCard(c.id, patch);
                    if (ok) setEditingCardId(null);
                  }}
                />
              </li>
            ) : (
              <li
                key={c.id}
                className="rounded-md border border-hairline bg-elevated p-4 transition-colors duration-150 hover:border-slate-muted"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm text-paper"
                      dangerouslySetInnerHTML={{ __html: renderCardHtml(c.front) }}
                    />
                    <p
                      className="mt-2 text-sm text-slate-muted"
                      dangerouslySetInnerHTML={{ __html: renderCardHtml(c.back) }}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingCardId(c.id)}
                      aria-label="Editar card"
                      className="rounded-sm p-1.5 text-slate-muted transition-colors duration-150 hover:bg-surface hover:text-paper"
                    >
                      <IconPencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCard(c.id)}
                      aria-label="Excluir card"
                      className={`rounded-sm p-1.5 transition-colors duration-150 ${
                        deletingCardId === c.id
                          ? "bg-bad/20 text-bad"
                          : "text-slate-muted hover:bg-surface hover:text-bad"
                      }`}
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      {deletingCardId ? (
        <p className="mt-2 text-2xs text-slate-muted">Clique na lixeira de novo para confirmar a exclusao.</p>
      ) : null}
    </div>
  );
}
