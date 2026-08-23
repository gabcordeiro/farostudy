/**
 * Preferência pessoal de estilo da interface: "icons" (padrão, com os chips de
 * ícone, mascote nos cantos etc.) ou "minimal" (mais limpo, sem esses enfeites).
 * Guardada no navegador e refletida em data-ui-style no <html>; o CSS esconde
 * os elementos marcados com .ui-decorative no modo minimal.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UiStyle = "icons" | "minimal";

const STORAGE_KEY = "faro.ui-style.v1";

interface UiStyleContextValue {
  style: UiStyle;
  setStyle: (s: UiStyle) => void;
}

const UiStyleContext = createContext<UiStyleContextValue | undefined>(undefined);

function read(): UiStyle {
  if (typeof window === "undefined") return "icons";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "minimal" ? "minimal" : "icons";
  } catch {
    return "icons";
  }
}

export function UiStyleProvider({ children }: { children: ReactNode }) {
  const [style, setStyleState] = useState<UiStyle>(read);

  useEffect(() => {
    document.documentElement.setAttribute("data-ui-style", style);
  }, [style]);

  const setStyle = useCallback((s: UiStyle) => {
    setStyleState(s);
    try {
      window.localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ style, setStyle }), [style, setStyle]);
  return <UiStyleContext.Provider value={value}>{children}</UiStyleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUiStyle(): UiStyleContextValue {
  const ctx = useContext(UiStyleContext);
  if (!ctx) throw new Error("useUiStyle deve ser usado dentro de <UiStyleProvider>");
  return ctx;
}
