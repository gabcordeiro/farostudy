/**
 * Modelo da aparência global (fonte + fundo) que o admin define e vale para
 * todos. Aqui ficam os registros curados (fontes e padrões), os defaults e a
 * geração do CSS -- com sanitização, já que os valores entram num <style>.
 */

export type FontKey = "roboto" | "fredoka" | "nunito" | "poppins" | "lato" | "merriweather";

export interface FontDef {
  label: string;
  /** family completa aplicada no body */
  stack: string;
  /** href do Google Fonts a injetar (null = já carregada no index.html) */
  href: string | null;
}

export const FONTS: Record<FontKey, FontDef> = {
  roboto: {
    label: "Roboto (padrão)",
    stack: "'Roboto', system-ui, sans-serif",
    href: null,
  },
  fredoka: {
    label: "Fredoka (arredondada)",
    stack: "'Fredoka', 'Roboto', system-ui, sans-serif",
    href: null, // já carregada para o logo
  },
  nunito: {
    label: "Nunito (suave)",
    stack: "'Nunito', 'Roboto', system-ui, sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;700&display=swap",
  },
  poppins: {
    label: "Poppins (geométrica)",
    stack: "'Poppins', 'Roboto', system-ui, sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap",
  },
  lato: {
    label: "Lato (clássica)",
    stack: "'Lato', 'Roboto', system-ui, sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
  },
  merriweather: {
    label: "Merriweather (serifada)",
    stack: "'Merriweather', Georgia, serif",
    href: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
  },
};

export type PatternKey = "dots" | "grid" | "diagonal";

export const PATTERNS: Record<PatternKey, { label: string }> = {
  dots: { label: "Bolinhas" },
  grid: { label: "Grade" },
  diagonal: { label: "Diagonais" },
};

export type BgConfig =
  | { kind: "solid" }
  | { kind: "gradient"; from: string; to: string; angle: number }
  | { kind: "pattern"; pattern: PatternKey }
  | { kind: "image"; url: string; size: number };

export interface Appearance {
  font: FontKey;
  background: { light: BgConfig; dark: BgConfig };
}

export const DEFAULT_APPEARANCE: Appearance = {
  font: "roboto",
  background: { light: { kind: "solid" }, dark: { kind: "solid" } },
};

// ---- Sanitização (os valores viram CSS num <style>) -------------------------

const HEX = /^#[0-9a-fA-F]{3,8}$/;

function safeColor(c: unknown, fallback: string): string {
  return typeof c === "string" && HEX.test(c) ? c : fallback;
}
function safeAngle(a: unknown): number {
  const n = Math.round(Number(a));
  return Number.isFinite(n) ? Math.min(360, Math.max(0, n)) : 135;
}
function safeSize(s: unknown): number {
  const n = Math.round(Number(s));
  return Number.isFinite(n) ? Math.min(512, Math.max(8, n)) : 64;
}
function safeUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  return /^https:\/\/[^"')]+$/.test(u) || /^data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+$/.test(u)
    ? u
    : null;
}

/** Normaliza um objeto vindo do banco para o tipo Appearance, com defaults. */
export function parseAppearance(raw: unknown): Appearance {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const font = (obj.font as FontKey) in FONTS ? (obj.font as FontKey) : "roboto";
  const bg = (obj.background ?? {}) as Record<string, unknown>;
  return {
    font,
    background: {
      light: parseBg(bg.light),
      dark: parseBg(bg.dark),
    },
  };
}

function parseBg(raw: unknown): BgConfig {
  const b = (raw ?? {}) as Record<string, unknown>;
  switch (b.kind) {
    case "gradient":
      return {
        kind: "gradient",
        from: safeColor(b.from, "#5B57D6"),
        to: safeColor(b.to, "#0B0F17"),
        angle: safeAngle(b.angle),
      };
    case "pattern":
      return { kind: "pattern", pattern: (b.pattern as PatternKey) in PATTERNS ? (b.pattern as PatternKey) : "dots" };
    case "image": {
      const url = safeUrl(b.url);
      return url ? { kind: "image", url, size: safeSize(b.size) } : { kind: "solid" };
    }
    default:
      return { kind: "solid" };
  }
}

// ---- Geração do CSS ---------------------------------------------------------

function patternCss(pattern: PatternKey, line: string): string {
  switch (pattern) {
    case "dots":
      return `background-image: radial-gradient(${line} 1px, transparent 1.5px); background-size: 16px 16px;`;
    case "grid":
      return `background-image: linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px); background-size: 24px 24px;`;
    case "diagonal":
      return `background-image: repeating-linear-gradient(45deg, ${line} 0 1px, transparent 1px 14px);`;
  }
}

/** CSS de fundo para um tema. `line` é a cor sutil do padrão (claro/escuro). */
function bgCss(bg: BgConfig, line: string): string {
  switch (bg.kind) {
    case "solid":
      return ""; // mantém a cor de fundo do token do tema
    case "gradient":
      return `background-color: ${bg.from}; background-image: linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to}); background-attachment: fixed;`;
    case "pattern":
      return `${patternCss(bg.pattern, line)} background-attachment: fixed;`;
    case "image":
      return `background-image: url("${bg.url}"); background-repeat: repeat; background-size: ${bg.size}px; background-attachment: fixed;`;
  }
}

/** Monta o conteúdo do <style> global a partir da aparência. */
export function appearanceCss(a: Appearance): string {
  const font = FONTS[a.font]?.stack ?? FONTS.roboto.stack;
  const light = bgCss(a.background.light, "rgba(0,0,0,0.05)");
  const dark = bgCss(a.background.dark, "rgba(255,255,255,0.05)");
  return [
    `body { font-family: ${font}; }`,
    light ? `html:not(.dark) body { ${light} }` : "",
    dark ? `html.dark body { ${dark} }` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
