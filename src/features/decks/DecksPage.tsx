/**
 * Lista de trilhas: criar, renomear, excluir, entrar no detalhe (cards).
 */
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { IconDeck, IconPencil, IconPlus, IconTrash } from "@/components/icons";
import { deckTitleSchema } from "@/lib/validation";
import { useArmedAction } from "@/lib/useArmedAction";
import { useDeckList } from "./useDeckList";

export default function DecksPage() {
  const { decks, loading, error, create, rename, remove } = useDeckList();

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [busyCreate, setBusyCreate] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { armedId: deletingId, confirm: confirmArm } = useArmedAction();

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const parsed = deckTitleSchema.safeParse(newTitle);
    if (!parsed.success) {
      setCreateError(parsed.error.issues[0]?.message ?? "Título inválido");
      return;
    }
    setBusyCreate(true);
    setCreateError(null);
    const created = await create(parsed.data);
    setBusyCreate(false);
    if (created) {
      setNewTitle("");
      setCreating(false);
    } else {
      setCreateError("Falha ao criar trilha.");
    }
  }

  function startEdit(id: string, current: string) {
    setEditingId(id);
    setEditValue(current);
  }

  async function saveEdit(id: string) {
    const parsed = deckTitleSchema.safeParse(editValue);
    if (!parsed.success) return;
    const ok = await rename(id, parsed.data);
    if (ok) setEditingId(null);
  }

  async function confirmDelete(id: string) {
    if (!confirmArm(id)) return;
    await remove(id);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SEO title="Trilhas" description="Gerencie suas trilhas de estudo." path="/trilhas" noindex />

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconDeck className="h-6 w-6 text-focus-soft" title="Trilhas" />
          <div>
            <h1 className="font-display text-2xl text-paper">Trilhas de estudo</h1>
            <p className="text-sm text-slate-muted">Organize seus cards por edital ou tema.</p>
          </div>
        </div>
        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 press hover:bg-action-deep"
          >
            <IconPlus className="h-4 w-4" />
            Nova trilha
          </button>
        ) : null}
      </header>

      {creating ? (
        <form
          onSubmit={handleCreate}
          className="mb-6 flex animate-fade-in flex-wrap items-start gap-2 rounded-md border border-hairline bg-elevated p-4"
        >
          <div className="min-w-0 flex-1">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nome da trilha (ex: Legislacao)"
              maxLength={160}
              className="w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
            />
            {createError ? <p className="mt-1 text-2xs text-bad">{createError}</p> : null}
          </div>
          <button
            type="submit"
            disabled={busyCreate}
            className="rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 press hover:bg-action-deep disabled:opacity-60"
          >
            {busyCreate ? "Criando..." : "Criar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setCreateError(null);
            }}
            className="rounded-sm border border-hairline px-4 py-2 text-sm text-slate-soft transition-colors duration-150 hover:text-paper"
          >
            Cancelar
          </button>
        </form>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      ) : decks.length === 0 ? (
        <EmptyState
          mood="sleepy"
          title="Nenhuma trilha ainda"
          description="Crie sua primeira trilha e gere cards com IA para começar a estudar."
          action={
            <Link
              to="/importar"
              className="press inline-block rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep"
            >
              Gerar cards
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {decks.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-elevated px-4 py-3 transition-colors duration-150 hover:border-slate-muted"
            >
              {editingId === d.id ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    maxLength={160}
                    className="min-w-0 flex-1 rounded-sm border border-focus bg-surface px-3 py-1.5 text-sm text-paper outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void saveEdit(d.id)}
                    className="rounded-sm bg-focus px-3 py-1.5 text-2xs font-medium text-paper hover:bg-focus-deep"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:text-paper"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <Link to={`/trilhas/${d.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-paper">{d.title}</p>
                  <p className="text-2xs text-slate-muted">
                    {d.cardCount} {d.cardCount === 1 ? "card" : "cards"}
                  </p>
                </Link>
              )}

              {editingId !== d.id ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(d.id, d.title)}
                    aria-label={`Renomear ${d.title}`}
                    className="rounded-sm p-1.5 text-slate-muted transition-colors duration-150 hover:bg-surface hover:text-paper"
                  >
                    <IconPencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDelete(d.id)}
                    aria-label={`Excluir ${d.title}`}
                    className={`rounded-sm p-1.5 transition-colors duration-150 ${
                      deletingId === d.id
                        ? "bg-bad/20 text-bad"
                        : "text-slate-muted hover:bg-surface hover:text-bad"
                    }`}
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {deletingId ? (
        <p className="mt-2 text-2xs text-slate-muted">Clique na lixeira de novo para confirmar. A trilha e todos os cards dela serão apagados.</p>
      ) : null}
    </div>
  );
}
