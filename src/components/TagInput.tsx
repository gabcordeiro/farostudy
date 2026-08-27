/**
 * Campo de tags com autocomplete: em vez de digitar livre (fácil de
 * escrever "Português" numa vez e "portugues" noutra, fragmentando o
 * agrupamento), sugere as tags já usadas na trilha enquanto digita.
 */
import { useRef, useState, type KeyboardEvent } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({ value, onChange, suggestions = [], placeholder, maxTags = 20 }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedValue = value.map((t) => t.toLowerCase());
  const pool = suggestions.filter((s) => !normalizedValue.includes(s.toLowerCase()));
  const matches = (draft.trim() ? pool.filter((s) => s.toLowerCase().includes(draft.trim().toLowerCase())) : pool).slice(
    0,
    6,
  );

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || value.length >= maxTags || normalizedValue.includes(tag.toLowerCase())) {
      setDraft("");
      return;
    }
    // Se já existe uma tag igual (ignorando maiúsculas/minúsculas) nas
    // sugestões, usa a grafia já em uso -- evita "Português" e "português"
    // virarem dois grupos diferentes.
    const existing = suggestions.find((s) => s.toLowerCase() === tag.toLowerCase());
    onChange([...value, existing ?? tag]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-hairline bg-surface px-2 py-1.5 focus-within:border-focus">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-sm border border-hairline bg-elevated px-1.5 py-0.5 text-2xs text-slate-soft"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remover tag ${tag}`}
              className="text-slate-muted hover:text-bad"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[8ch] flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-slate-muted"
        />
      </div>
      {open && matches.length > 0 ? (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-sm border border-hairline bg-elevated shadow-pop">
          {matches.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(s)}
                className="block w-full px-3 py-1.5 text-left text-sm text-paper hover:bg-surface"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
