/**
 * Faro Cards Design System
 * -------------------------------------------------------------------------
 * Regras de design (Anti-Vibecoding) codificadas aqui:
 *  - Sem branco puro: o tom mais claro e `paper` (#E7EAF0), nunca #fff. (#3)
 *  - Paleta Slate + Indigo (foco) + Laranja (acoes), sem arco-iris/neon. (#4,#20,#29)
 *  - Cantos definidos: radius maximo 6px, nada de "soft/pill". (#19)
 *  - Sombras discretas e unicas, nunca empilhadas. (#5)
 *  - Fontes proprias: Sora (UI) + Fraunces (display). Evita Inter/Geist/Space Grotesk. (#10)
 */
var config = {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                // Fundos Slate / Cinza Azulado Escuro (dark por padrao)
                ink: {
                    900: "#0B0F17", // fundo raiz
                    800: "#111725", // superficie
                    700: "#171F30", // cards
                    600: "#1F293D", // elevado
                    500: "#2A3656", // hairline elevado
                },
                slate: {
                    border: "#243044",
                    muted: "#8A97AD",
                    soft: "#B4BECF",
                },
                paper: "#E7EAF0", // tom "claro" - NUNCA branco puro
                // Indigo = Foco
                focus: {
                    DEFAULT: "#5B57D6",
                    soft: "#7A76E8",
                    deep: "#3F3BAE",
                },
                // Laranja = Acoes / CTAs
                action: {
                    DEFAULT: "#F2762E",
                    soft: "#F79355",
                    deep: "#C85A19",
                },
                // Estados semanticos sobrios (sem neon)
                good: "#3F9C74",
                warn: "#C7973F",
                bad: "#C25A54",
            },
            fontFamily: {
                sans: ['"Sora"', "system-ui", "sans-serif"],
                display: ['"Fraunces"', "Georgia", "serif"],
                mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
            },
            borderRadius: {
                // Cantos definidos - teto proposital em 6px
                none: "0",
                sm: "2px",
                DEFAULT: "3px",
                md: "4px",
                lg: "6px",
            },
            boxShadow: {
                // Uma sombra sutil, sem drop shadows empilhados
                card: "0 1px 0 0 rgba(255,255,255,0.02), 0 1px 3px rgba(0,0,0,0.35)",
                pop: "0 4px 16px rgba(0,0,0,0.4)",
            },
            fontSize: {
                "2xs": ["0.6875rem", { lineHeight: "1rem" }],
            },
        },
    },
    plugins: [],
};
export default config;
