/**
 * Mascote "Faro" (Basset Hound geometrico).
 * Renderizado em pontos estrategicos: login, empty states, loading e logo.
 * SEMPRE com alt text (checklist produção #9).
 */
type MascotMood = "default" | "search" | "sleepy" | "cheer";

const MOOD_SRC: Record<MascotMood, string> = {
  default: "/mascot-default.png",
  search: "/mascot-search.png",
  sleepy: "/mascot-sleepy.png",
  cheer: "/mascot-cheer.png",
};

const SIZES = { sm: 40, md: 96, lg: 160, xl: 220 } as const;

interface MascotProps {
  size?: keyof typeof SIZES;
  mood?: MascotMood;
  className?: string;
  /** Descrição contextual para leitores de tela. */
  alt?: string;
}

const MOOD_ALT: Record<MascotMood, string> = {
  default: "Faro, o mascote basset hound do Faro Study",
  search: "Faro farejando novos cards para estudar",
  sleepy: "Faro descansando enquanto seus cards carregam",
  cheer: "Faro comemorando sua sequência de estudos",
};

export function Mascot({ size = "md", mood = "default", className, alt }: MascotProps) {
  const px = SIZES[size];
  return (
    <img
      src={MOOD_SRC[mood]}
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
