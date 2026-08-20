import type { Config } from "tailwindcss";

/**
 * Faro Study Design System
 * -------------------------------------------------------------------------
 * Regras de design (Anti-Vibecoding) codificadas aqui:
 *  - Sem branco puro (#3): tokens semanticos resolvem via var(--bg-*) e no
 *    tema light o `bg-page` fica em Slate claro, nunca #fff.
 *  - Paleta Slate + Indigo (foco) + Laranja (acoes), sem arco-iris/neon.
 *  - Cantos definidos: radius maximo 6px, nada de "soft/pill".
 *  - Sombras discretas e unicas, nunca empilhadas.
 *  - Fonte Roboto (UI/display), sem Inter/Geist/Space Grotesk.
 *
 * Tokens semanticos (respondem ao tema via <html class="dark">):
 *   bg-page, bg-surface, bg-elevated, border-hairline,
 *   text-primary, text-soft, text-muted
 * Aliases legados (ink.*, slate.*, paper) apontam para os mesmos tokens,
 * evitando refatorar cada arquivo em uma unica passada.
 */
const withVar = (name: string) => `hsl(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens semanticos
        page: withVar("--bg-page"),
        surface: withVar("--bg-surface"),
        elevated: withVar("--bg-elevated"),
        hairline: withVar("--border-hairline"),

        // Aliases legados apontando para os tokens semanticos
        ink: {
          900: withVar("--bg-page"),
          800: withVar("--bg-surface"),
          700: withVar("--bg-elevated"),
          600: withVar("--bg-elevated"),
          500: withVar("--border-hairline"),
        },
        slate: {
          border: withVar("--border-hairline"),
          muted: withVar("--text-muted"),
          soft: withVar("--text-soft"),
        },
        paper: withVar("--text-primary"),

        // Acentos permanecem os mesmos nos dois temas
        focus: {
          DEFAULT: "#5B57D6",
          soft: "#7A76E8",
          deep: "#3F3BAE",
        },
        action: {
          DEFAULT: "#F2762E",
          soft: "#F79355",
          deep: "#C85A19",
        },
        good: "#3F9C74",
        warn: "#C7973F",
        bad: "#C25A54",
      },
      fontFamily: {
        sans: ["Roboto", "system-ui", "sans-serif"],
        display: ["Roboto", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
        lg: "6px",
      },
      boxShadow: {
        card: "0 1px 0 0 hsl(var(--border-hairline) / 0.35), 0 1px 3px hsl(0 0% 0% / 0.25)",
        pop: "0 4px 16px hsl(0 0% 0% / 0.35)",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      transitionTimingFunction: {
        // Curva unica do produto: saida rapida, chegada suave. Nada de bounce.
        fluid: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Onda de brilho da esquerda para a direita, sem piscar: o bloco
        // mantem opacidade constante e so a faixa clara viaja por cima.
        //
        // Os numeros parecem invertidos de proposito: com background-size
        // maior que a caixa, a porcentagem de background-position e calculada
        // sobre (largura_da_caixa - largura_da_imagem), que e negativa. Logo
        // porcentagem MAIOR desloca a imagem para a ESQUERDA. Comecar em 250%
        // (faixa fora, a esquerda) e terminar em -150% (fora, a direita) e o
        // que faz a onda correr da esquerda para a direita -- conferido
        // medindo a coluna mais clara quadro a quadro.
        shimmer: {
          from: { backgroundPosition: "250% 0" },
          to: { backgroundPosition: "-150% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "rise-in": "rise-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "toast-in": "toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
        // Lento e constante: linear para nao acelerar/frear no meio do curso.
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
