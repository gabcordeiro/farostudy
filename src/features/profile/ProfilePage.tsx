/**
 * Edição do perfil: nome de exibição + foto (upload ao bucket `avatars`).
 * Todas as escritas passam por RLS. Upload válida tipo/tamanho no cliente.
 */
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { Avatar } from "@/components/Avatar";
import { IconUpload, IconUser } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { profileUpdateSchema, validateAvatarFile } from "@/lib/validation";
import { useAuth } from "@/features/auth/AuthProvider";
import { useUiStyle } from "@/features/theme/UiStyleProvider";
import { useProfile } from "./useProfile";

export default function ProfilePage() {
  const { user } = useAuth();
  const { profile, loading, error, update } = useProfile();
  const { style, setStyle } = useUiStyle();

  const [displayName, setDisplayName] = useState("");
  const [dailyGoal, setDailyGoal] = useState(20);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setDailyGoal(profile.daily_goal ?? 20);
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar o mesmo arquivo
    if (!file || !user) return;
    setFormError(null);
    setNotice(null);

    const check = validateAvatarFile(file);
    if (!check.ok) {
      setFormError(check.error);
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      setFormError(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-buster para o navegador buscar a imagem nova.
    const url = `${pub.publicUrl}?t=${Date.now()}`;

    const ok = await update({ avatar_url: url });
    setUploading(false);
    if (ok) {
      setAvatarUrl(url);
      setNotice("Foto atualizada.");
      // Limpeza best-effort dos arquivos antigos do usuário.
      void supabase.storage
        .from("avatars")
        .list(user.id, { limit: 20 })
        .then(({ data }) => {
          if (!data) return;
          const stale = data
            .filter((obj) => `${user.id}/${obj.name}` !== path)
            .map((obj) => `${user.id}/${obj.name}`);
          if (stale.length) supabase.storage.from("avatars").remove(stale);
        });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    const parsed = profileUpdateSchema.safeParse({ display_name: displayName });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }
    setSaving(true);
    const goal = Math.min(500, Math.max(1, Math.round(dailyGoal) || 20));
    const ok = await update({ ...parsed.data, daily_goal: goal });
    setSaving(false);
    if (ok) setNotice("Perfil salvo.");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <SEO title="Perfil" description="Edite seu nome e foto no Faro Study." path="/perfil" noindex />

      <header className="mb-6 flex items-center gap-3">
        <IconUser className="h-6 w-6 text-focus-soft" title="Perfil" />
        <div>
          <h1 className="font-display text-2xl text-paper">Seu perfil</h1>
          <p className="text-sm text-slate-muted">Como o Faro vai te reconhecer.</p>
        </div>
      </header>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-64" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-md border border-hairline bg-elevated p-5"
        >
          <div className="flex flex-wrap items-center gap-5">
            <Avatar size="lg" url={avatarUrl} name={displayName || user?.email} />
            <div className="flex flex-col gap-2">
              <label className="press inline-flex cursor-pointer items-center gap-2 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper hover:border-slate-muted">
                <IconUpload className="h-4 w-4" />
                {uploading ? "Enviando..." : "Trocar foto"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFile}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
              <p className="text-2xs text-slate-muted">PNG, JPG ou WebP, até 2 MB.</p>
            </div>
          </div>

          <div>
            <label htmlFor="display_name" className="mb-1 block text-sm text-slate-soft">
              Nome de exibição
            </label>
            <input
              id="display_name"
              type="text"
              maxLength={80}
              value={displayName}
              onChange={(ev) => setDisplayName(ev.target.value)}
              className="w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
            />
          </div>

          <div>
            <label htmlFor="daily_goal" className="mb-1 block text-sm text-slate-soft">
              Meta diária de cards
            </label>
            <input
              id="daily_goal"
              type="number"
              min={1}
              max={500}
              value={dailyGoal}
              onChange={(ev) => setDailyGoal(Number(ev.target.value))}
              className="w-32 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
            />
            <p className="mt-1 text-2xs text-slate-muted">
              Quantos cards você quer revisar por dia. Aparece no painel como meta.
            </p>
          </div>

          <div>
            <span className="mb-1 block text-sm text-slate-soft">Estilo da interface</span>
            <div className="inline-flex overflow-hidden rounded-sm border border-hairline">
              <button
                type="button"
                onClick={() => setStyle("icons")}
                aria-pressed={style === "icons"}
                className={`press px-4 py-2 text-sm ${style === "icons" ? "bg-focus text-paper" : "bg-surface text-slate-soft hover:text-paper"}`}
              >
                Com ícones
              </button>
              <button
                type="button"
                onClick={() => setStyle("minimal")}
                aria-pressed={style === "minimal"}
                className={`press px-4 py-2 text-sm ${style === "minimal" ? "bg-focus text-paper" : "bg-surface text-slate-soft hover:text-paper"}`}
              >
                Minimalista
              </button>
            </div>
            <p className="mt-1 text-2xs text-slate-muted">
              "Minimalista" esconde os enfeites (chips de ícone, mascote nos cantos) para uma tela mais limpa.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-soft">E-mail</label>
            <input
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="w-full cursor-not-allowed rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-slate-muted"
            />
          </div>

          {formError ? (
            <p role="alert" className="rounded-sm border border-bad/40 bg-bad/10 px-3 py-2 text-2xs text-bad">
              {formError}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="rounded-sm border border-focus/40 bg-focus/10 px-3 py-2 text-2xs text-focus-soft">
              {notice}
            </p>
          ) : null}
          {error && !formError ? (
            <p role="alert" className="text-2xs text-bad">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="press rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}
    </div>
  );
}
