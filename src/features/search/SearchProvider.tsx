/**
 * Disponibiliza a busca global para qualquer parte do app autenticado
 * (botão na sidebar/cabeçalho e atalho Cmd/Ctrl+K).
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SearchModal } from "./SearchModal";

interface SearchContextValue {
  open: () => void;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ open: () => setIsOpen(true) }), []);

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchModal open={isOpen} onClose={() => setIsOpen(false)} />
    </SearchContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch deve ser usado dentro de <SearchProvider>");
  return ctx;
}
