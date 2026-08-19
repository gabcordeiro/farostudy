/**
 * Avatar do usuario: imagem com fallback para iniciais.
 * Sempre com alt text (checklist producao #9).
 */
const SIZES = { sm: 28, md: 40, lg: 96 } as const;

interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Avatar({ url, name, size = "md", className = "" }: AvatarProps) {
  const px = SIZES[size];
  const label = name ? `Foto de ${name}` : "Foto do perfil";
  if (url) {
    return (
      <img
        src={url}
        alt={label}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        className={`rounded-sm border border-hairline object-cover ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-sm border border-hairline bg-elevated text-xs font-medium text-paper ${className}`}
      style={{ width: px, height: px, fontSize: Math.round(px * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}
