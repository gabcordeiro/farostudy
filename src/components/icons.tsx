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
