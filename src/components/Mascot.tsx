/**
 * Mascote "Faro" (Basset Hound geometrico).
 * Renderizado em pontos estrategicos: login, empty states, loading e logo.
 * SEMPRE com alt text (checklist producao #9).
 *
 * Quando o PNG transparente final estiver disponivel, coloque-o em
 * `public/faro-mascot.png` e troque DEFAULT_SRC. O SVG placeholder ja renderiza.
 */
type MascotMood = "default" | "search" | "sleepy" | "cheer";

const DEFAULT_SRC = "/faro-mascot.svg"; // trocar por "/faro-mascot.png" com o asset final

const SIZES = { sm: 40, md: 96, lg: 160, xl: 220 } as const;

interface MascotProps {
  size?: keyof typeof SIZES;
  mood?: MascotMood;
  className?: string;
  /** Descricao contextual para leitores de tela. */
  alt?: string;
}

const MOOD_ALT: Record<MascotMood, string> = {
  default: "Faro, o mascote basset hound do Faro Study",
  search: "Faro farejando novos cards para estudar",
  sleepy: "Faro descansando enquanto seus cards carregam",
  cheer: "Faro comemorando sua sequencia de estudos",
};

export function Mascot({ size = "md", mood = "default", className, alt }: MascotProps) {
  const px = SIZES[size];
  return (
    <img
      src={DEFAULT_SRC}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      alt={alt ?? MOOD_ALT[mood]}
      className={className}
      style={{ imageRendering: "auto" }}
    />
  );
}
