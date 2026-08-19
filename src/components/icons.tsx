/**
 * Icones proprios em SVG (stroke). Evita Lucide (regra de design #2) e
 * qualquer icone de "sparkle/brilho" (#24). Traco de 1.6, cantos definidos.
 */
import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Base({ title, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const IconLayers = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="M3 13l9 5 9-5" />
  </Base>
);

export const IconDeck = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="5" width="13" height="16" />
    <path d="M8 5V3h13v16h-2" />
  </Base>
);

export const IconChart = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 4v16h16" />
    <path d="M8 15v3M12 10v8M16 6v12" />
  </Base>
);

export const IconFlame = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3c1 3-1 4-1 6a2 2 0 1 0 4 0c0-1 0-2-.5-3 2 1 3.5 3.5 3.5 6a6 6 0 1 1-12 0c0-3 2-5 3-7 .8-1.6 2-2 3-2Z" />
  </Base>
);

export const IconAudio = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9v6h4l5 4V5L8 9H4Z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
  </Base>
);

export const IconUpload = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 15v4h16v-4" />
    <path d="M12 4v11M8 8l4-4 4 4" />
  </Base>
);

export const IconRoute = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6" cy="6" r="2.2" />
    <circle cx="18" cy="18" r="2.2" />
    <path d="M8 6h6a3 3 0 0 1 0 6H10a3 3 0 0 0 0 6h6" />
  </Base>
);

export const IconTarget = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.5" />
  </Base>
);

export const IconArrowDownRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 7l10 10M17 9v8H9" />
  </Base>
);

export const IconArrowUpRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Base>
);

export const IconLogout = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 4H6v16h8" />
    <path d="M10 12h10M17 9l3 3-3 3" />
  </Base>
);

export const IconWand = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 18 16 8M14 4h1M19 9h1M18 4v1M4 14v1M9 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
  </Base>
);

export const IconSun = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5" />
  </Base>
);

export const IconMoon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z" />
  </Base>
);

export const IconSystem = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="12" />
    <path d="M8 20h8M12 16v4" />
  </Base>
);

export const IconQuiz = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="16" height="16" />
    <path d="M8 10h5M8 14h8M8 18h6" />
  </Base>
);

export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </Base>
);

export const IconPencil = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20h4l11-11-4-4L4 16v4Z" />
    <path d="M13 7l4 4" />
  </Base>
);

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" />
    <path d="M10 11v6M14 11v6" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconCoin = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M9.5 15c0 1 1 1.5 2.5 1.5s2.5-.6 2.5-1.6c0-2.4-5-1-5-3.4 0-1 1-1.6 2.5-1.6s2.5.5 2.5 1.5M12 7.5v1M12 15.5v1" />
  </Base>
);

export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12l5 5L20 6" />
  </Base>
);

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 5l14 14M19 5 5 19" />
  </Base>
);
