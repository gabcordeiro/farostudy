/**
 * Aparência global (admin): escolhe a fonte do app e o fundo (sólido,
 * gradiente, padrão ou imagem) para os temas claro e escuro. Pré-visualiza ao
 * vivo enquanto edita e aplica para todos os usuários com um clique.
 *
 * O fundo é editado para o TEMA ATUAL -- há um atalho para alternar o tema e
 * configurar o outro. A pré-visualização é local; só "Aplicar para todos"
 * persiste (via RPC restrita a admin).
 */
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/features/theme/ThemeProvider";
import { useAppearance } from "@/features/appearance/AppearanceProvider";
import {
  DEFAULT_APPEARANCE,
  FONTS,
  PATTERNS,
  type Appearance,
  type BgConfig,
  type FontKey,
  type PatternKey,
} from "@/features/appearance/appearance";

const BG_KINDS: { key: BgConfig["kind"]; label: string }[] = [
  { key: "solid", label: "Sólido" },
  { key: "gradient", label: "Gradiente" },
  { key: "pattern", label: "Padrão" },
  { key: "image", label: "Imagem" },
];

function defaultFor(kind: BgConfig["kind"], dark: boolean): BgConfig {
  switch (kind) {
    case "solid":
      return { kind: "solid" };
    case "gradient":
      return dark
        ? { kind: "gradient", from: "#141B2E", to: "#0B0F17", angle: 160 }
        : { kind: "gradient", from: "#EEF1F8", to: "#DCE2F0", angle: 160 };
    case "pattern":
      return { kind: "pattern", pattern: "dots" };
    case "image":
      return { kind: "image", url: "", size: 128 };
  }
}

export function AdminAppearance() {
  const { notify } = useToast();
  const { resolved, setPreference } = useTheme();
  const { saved, setPreview, save, saving } = useAppearance();

  const [draft, setDraft] = useState<Appearance>(saved);

  // Sincroniza quando o valor salvo chega/atualiza (carga async, ou após salvar).
  useEffect(() => setDraft(saved), [saved]);

  // Pré-visualiza ao vivo; ao sair da tela volta ao que está salvo.
  useEffect(() => {
    setPreview(draft);
    return () => setPreview(null);
  }, [draft, setPreview]);

  const isDark = resolved === "dark";
  const bg = draft.background[resolved];

  function setBg(next: BgConfig) {
    setDraft((d) => ({ ...d, background: { ...d.background, [resolved]: next } }));
  }

  async function applyAll() {
    const ok = await save(draft);
    notify(ok ? "Aparência aplicada para todos." : "Falha ao salvar a aparência.", ok ? "success" : "error");
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-muted">
        As mudanças valem para <span className="text-paper">todos os usuários</span> depois de
        aplicar. Enquanto edita, você vê uma prévia só sua.
      </p>

      {/* Fonte do corpo */}
      <div className="rounded-md border border-hairline bg-elevated p-4">
        <label className="mb-2 block text-2xs uppercase tracking-wider text-slate-muted">
          Fonte do texto
        </label>
        <select
          value={draft.font}
          onChange={(e) => setDraft((d) => ({ ...d, font: e.target.value as FontKey }))}
          className="w-full max-w-xs rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
        >
          {(Object.keys(FONTS) as FontKey[]).map((k) => (
            <option key={k} value={k}>
              {FONTS[k].label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-lg text-paper">
          O rápido Faro marrom salta sobre 1.234 cards. — prévia da fonte
        </p>
      </div>

      {/* Fonte dos títulos */}
      <div className="rounded-md border border-hairline bg-elevated p-4">
        <label className="mb-2 block text-2xs uppercase tracking-wider text-slate-muted">
          Fonte dos títulos
        </label>
        <select
          value={draft.titleFont}
          onChange={(e) => setDraft((d) => ({ ...d, titleFont: e.target.value as FontKey }))}
          className="w-full max-w-xs rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
        >
          {(Object.keys(FONTS) as FontKey[]).map((k) => (
            <option key={k} value={k}>
              {FONTS[k].label}
            </option>
          ))}
        </select>
        <p className="mt-2 font-display text-lg text-paper">
          O rápido Faro marrom salta sobre 1.234 cards. — prévia da fonte
        </p>
      </div>

      {/* Fonte da marca */}
      <div className="rounded-md border border-hairline bg-elevated p-4">
        <label className="mb-2 block text-2xs uppercase tracking-wider text-slate-muted">
          Fonte da marca (Faro Study)
        </label>
        <select
          value={draft.brandFont}
          onChange={(e) => setDraft((d) => ({ ...d, brandFont: e.target.value as FontKey }))}
          className="w-full max-w-xs rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
        >
          {(Object.keys(FONTS) as FontKey[]).map((k) => (
            <option key={k} value={k}>
              {FONTS[k].label}
            </option>
          ))}
        </select>
        <p className="mt-2 font-brand text-lg font-semibold text-paper">Faro Study — prévia da fonte</p>
      </div>

      {/* Fundo */}
      <div className="rounded-md border border-hairline bg-elevated p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-2xs uppercase tracking-wider text-slate-muted">
            Fundo — tema {isDark ? "escuro" : "claro"}
          </span>
          <div className="inline-flex overflow-hidden rounded-sm border border-hairline text-2xs">
            <button
              type="button"
              onClick={() => setPreference("light")}
              className={`press px-2.5 py-1 ${!isDark ? "bg-focus text-paper" : "bg-surface text-slate-soft"}`}
            >
              Claro
            </button>
            <button
              type="button"
              onClick={() => setPreference("dark")}
              className={`press px-2.5 py-1 ${isDark ? "bg-focus text-paper" : "bg-surface text-slate-soft"}`}
            >
              Escuro
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {BG_KINDS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setBg(defaultFor(key, isDark))}
              className={`press rounded-sm border px-3 py-1.5 text-2xs ${
                bg.kind === key
                  ? "border-focus text-paper"
                  : "border-hairline text-slate-soft hover:text-paper"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {bg.kind === "solid" ? (
          <p className="text-2xs text-slate-muted">
            Usa a cor de fundo padrão do tema (como é hoje).
          </p>
        ) : null}

        {bg.kind === "gradient" ? (
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-2xs text-slate-muted">
              De
              <input
                type="color"
                value={bg.from}
                onChange={(e) => setBg({ ...bg, from: e.target.value })}
                className="mt-1 block h-9 w-16 cursor-pointer rounded-sm border border-hairline bg-surface"
              />
            </label>
            <label className="text-2xs text-slate-muted">
              Até
              <input
                type="color"
                value={bg.to}
                onChange={(e) => setBg({ ...bg, to: e.target.value })}
                className="mt-1 block h-9 w-16 cursor-pointer rounded-sm border border-hairline bg-surface"
              />
            </label>
            <label className="flex-1 text-2xs text-slate-muted">
              Ângulo: {bg.angle}°
              <input
                type="range"
                min={0}
                max={360}
                value={bg.angle}
                onChange={(e) => setBg({ ...bg, angle: Number(e.target.value) })}
                className="mt-1 block w-full"
              />
            </label>
          </div>
        ) : null}

        {bg.kind === "pattern" ? (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PATTERNS) as PatternKey[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBg({ kind: "pattern", pattern: p })}
                className={`press rounded-sm border px-3 py-1.5 text-2xs ${
                  bg.pattern === p
                    ? "border-focus text-paper"
                    : "border-hairline text-slate-soft hover:text-paper"
                }`}
              >
                {PATTERNS[p].label}
              </button>
            ))}
          </div>
        ) : null}

        {bg.kind === "image" ? (
          <div className="space-y-3">
            <label className="block text-2xs text-slate-muted">
              URL da imagem (https, de preferência um azulejo/tile que repete sem emenda)
              <input
                type="url"
                value={bg.url}
                onChange={(e) => setBg({ ...bg, url: e.target.value })}
                placeholder="https://.../textura.png"
                className="mt-1 w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
              />
            </label>
            <label className="block text-2xs text-slate-muted">
              Tamanho do azulejo: {bg.size}px
              <input
                type="range"
                min={16}
                max={512}
                value={bg.size}
                onChange={(e) => setBg({ ...bg, size: Number(e.target.value) })}
                className="mt-1 block w-full max-w-xs"
              />
            </label>
          </div>
        ) : null}
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void applyAll()}
          disabled={saving}
          className="press rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-action-ink hover:bg-action-deep disabled:opacity-60"
        >
          {saving ? "Aplicando..." : "Aplicar para todos"}
        </button>
        <button
          type="button"
          onClick={() => setDraft(saved)}
          className="press rounded-sm border border-hairline px-4 py-2 text-sm text-slate-soft hover:text-paper"
        >
          Desfazer alterações
        </button>
        <button
          type="button"
          onClick={() => setDraft(DEFAULT_APPEARANCE)}
          className="press rounded-sm border border-hairline px-4 py-2 text-sm text-slate-soft hover:text-paper"
        >
          Restaurar padrão
        </button>
      </div>
    </div>
  );
}
