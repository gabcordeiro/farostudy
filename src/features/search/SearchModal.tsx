/**
 * Paleta de busca (Cmd/Ctrl+K): procura trilhas e cards e leva direto ao
 * resultado. Sem cor de fundo saturada, no padrão sóbrio do app.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { IconDeck, IconRoute } from "@/components/icons";
import { renderCardHtml } from "@/lib/sanitize";
import { useGlobalSearch } from "./useGlobalSearch";

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { results, loading } = useGlobalSearch(query);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      // foco após o portal montar
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function go(to: string) {
    onClose();
    navigate(to);
  }

  const hasQuery = query.trim().length >= 2;
  const empty = hasQuery && !loading && results.decks.length === 0 && results.cards.length === 0;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 animate-fade-in bg-page/80" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        className="animate-rise-in fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-md border border-hairline bg-elevated shadow-pop"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar trilhas e cards..."
          className="w-full border-b border-hairline bg-transparent px-4 py-3 text-sm text-paper outline-none placeholder:text-slate-muted"
        />

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {!hasQuery ? (
            <p className="px-2 py-6 text-center text-2xs text-slate-muted">
              Digite ao menos 2 letras para buscar.
            </p>
          ) : null}

          {empty ? (
            <p className="px-2 py-6 text-center text-2xs text-slate-muted">
              Nada encontrado para “{query.trim()}”.
            </p>
          ) : null}

          {results.decks.length > 0 ? (
            <div className="mb-1">
              <p className="px-2 py-1 text-2xs uppercase tracking-wider text-slate-muted">Trilhas</p>
              {results.decks.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => go(`/trilhas/${d.id}`)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-paper hover:bg-surface"
                >
                  <IconRoute className="h-4 w-4 shrink-0 text-focus-soft" />
                  <span className="min-w-0 flex-1 truncate">{d.title}</span>
                </button>
              ))}
            </div>
          ) : null}

          {results.cards.length > 0 ? (
            <div>
              <p className="px-2 py-1 text-2xs uppercase tracking-wider text-slate-muted">Cards</p>
              {results.cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => go(`/trilhas/${c.deckId}`)}
                  className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left hover:bg-surface"
                >
                  <IconDeck className="mt-0.5 h-4 w-4 shrink-0 text-slate-muted" />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-sm text-paper"
                      dangerouslySetInnerHTML={{ __html: renderCardHtml(c.front) }}
                    />
                    {c.deckTitle ? (
                      <span className="block truncate text-2xs text-slate-muted">{c.deckTitle}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  );
}
