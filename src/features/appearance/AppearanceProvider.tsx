/**
 * Aplica a aparência global (fonte + fundo) definida pelo admin, lida da
 * tabela app_settings (pública). O admin pode pré-visualizar localmente antes
 * de salvar para todos. A aplicação é feita por um <style> no <head> e, para
 * fontes não pré-carregadas, injetando o <link> do Google Fonts.
 *
 * Cache em localStorage + useLayoutEffect (não useEffect): sem isso, toda
 * carga da página pintava primeiro com o default embutido no CSS estático e
 * só trocava pra aparência real (ex.: Poppins) depois que a consulta ao
 * Supabase respondia -- um salto visível a cada F5. Guardando a última
 * aparência conhecida, ela já entra pronta no primeiro render, e o
 * useLayoutEffect aplica ela ANTES do navegador pintar (ao contrário do
 * useEffect, que só roda depois de já ter pintado). Só sobra um salto se o
 * admin mudou a aparência desde a última visita desse navegador -- raro --
 * ou na primeiríssima visita, sem cache ainda (cai no default do CSS).
 */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  appearanceCss,
  DEFAULT_APPEARANCE,
  FONTS,
  parseAppearance,
  type Appearance,
} from "./appearance";

interface AppearanceContextValue {
  /** Aparência salva (a que vale para todos). */
  saved: Appearance;
  /** Pré-visualização local do admin (não persiste), ou null. */
  preview: Appearance | null;
  setPreview: (a: Appearance | null) => void;
  save: (a: Appearance) => Promise<boolean>;
  saving: boolean;
}

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

const STYLE_ID = "faro-appearance";
const CACHE_KEY = "faro.appearance-cache.v1";
const injectedFonts = new Set<string>();

function readCachedAppearance(): Appearance {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? parseAppearance(JSON.parse(raw)) : DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function writeCachedAppearance(a: Appearance) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(a));
  } catch {
    // Sem cache (modo privado, quota cheia etc.) -- degrada pro comportamento
    // antigo, só com o flash de volta. Não é motivo pra quebrar nada.
  }
}

function ensureFontLink(href: string | null) {
  if (!href || injectedFonts.has(href)) return;
  injectedFonts.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function apply(a: Appearance) {
  ensureFontLink(FONTS[a.font]?.href ?? null);
  ensureFontLink(FONTS[a.titleFont]?.href ?? null);
  ensureFontLink(FONTS[a.brandFont]?.href ?? null);
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = appearanceCss(a);
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Appearance>(readCachedAppearance);
  const [preview, setPreviewState] = useState<Appearance | null>(null);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);

  // Carrega a aparência salva uma vez (e atualiza o cache pra próxima visita
  // já nascer certa, sem esperar essa consulta de novo).
  useEffect(() => {
    mounted.current = true;
    void (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("appearance")
        .eq("id", 1)
        .maybeSingle();
      if (!mounted.current || !data?.appearance) return;
      const fresh = parseAppearance(data.appearance);
      setSaved(fresh);
      writeCachedAppearance(fresh);
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  // Aplica sempre o efetivo (preview do admin tem prioridade sobre o salvo).
  // useLayoutEffect, não useEffect: precisa rodar ANTES do navegador pintar
  // -- com o cache acima já trazendo o valor certo no primeiro render, isso
  // é o que garante zero salto visível a partir da segunda visita.
  useLayoutEffect(() => {
    apply(preview ?? saved);
  }, [preview, saved]);

  const setPreview = useCallback((a: Appearance | null) => setPreviewState(a), []);

  const save = useCallback(async (a: Appearance): Promise<boolean> => {
    setSaving(true);
    const { error } = await supabase.rpc("set_app_appearance", {
      p_appearance: a as unknown as Record<string, unknown>,
    });
    setSaving(false);
    if (error) return false;
    setSaved(a);
    writeCachedAppearance(a);
    setPreviewState(null);
    return true;
  }, []);

  const value = useMemo(
    () => ({ saved, preview, setPreview, save, saving }),
    [saved, preview, setPreview, save, saving],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance deve ser usado dentro de <AppearanceProvider>");
  return ctx;
}
