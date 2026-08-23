/**
 * Login / Cadastro (Supabase Auth): email+senha e Google OAuth.
 * Mascote ao lado do formulario (regra de UI #1). Validação Zod + estados de erro.
 * Cadastro pede nome completo, confirmação de senha, foto (opcional) e
 * consentimento explícito de Termos/Privacidade (LGPD) -- ver
 * handle_new_user() em supabase/migrations/0009_signup_consent.sql, que
 * grava accepted_tos_at/accepted_privacy_at a partir do metadata do signUp.
 */
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { authEmailSchema, authSignupSchema, validateAvatarFile } from "@/lib/validation";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "./AuthProvider";
import { Mascot } from "@/components/Mascot";
import { Avatar } from "@/components/Avatar";
import { IconUpload } from "@/components/icons";

type Mode = "signin" | "signup";
type LocationState = { from?: string };

interface FieldErrors {
  email?: string;
  password?: string;
  fullName?: string;
  confirmPassword?: string;
  tosAccepted?: string;
  avatar?: string;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

/** Best-effort: a conta já existe nesse ponto, então uma falha aqui não bloqueia o cadastro. */
async function uploadSignupAvatar(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return;
  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  await supabase
    .from("profiles")
    .update({ avatar_url: `${pub.publicUrl}?t=${Date.now()}` })
    .eq("id", userId);
}

export function LoginPage() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? "/painel";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Tela dedicada pós-cadastro (em vez de um aviso dentro do formulário) --
  // ver o comentário em handleSubmit sobre por que o texto precisa valer
  // tanto pra e-mail novo quanto pra e-mail que já tem conta.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [postSignupExtra, setPostSignupExtra] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Preview local do arquivo escolhido -- nunca sobe pro Storage antes do
  // envio (a policy do bucket exige uma sessão autenticada que só existe
  // depois do signUp, e nem sempre logo em seguida -- ver handleSubmit).
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  if (!loading && session) return <Navigate to={from} replace />;

  const redirectTo = `${window.location.origin}/auth/callback`;

  function switchMode(next: Mode) {
    setMode(next);
    setFormError(null);
    setAwaitingConfirmation(false);
    setPostSignupExtra(null);
    setFieldErrors({});
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar o mesmo arquivo
    if (!file) return;
    const check = validateAvatarFile(file);
    if (!check.ok) {
      setFieldErrors((prev) => ({ ...prev, avatar: check.error }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, avatar: undefined }));
    setAvatarFile(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (mode === "signin") {
      const parsed = authEmailSchema.safeParse({ email, password });
      if (!parsed.success) {
        const errs: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (key === "email") errs.email = issue.message;
          if (key === "password") errs.password = issue.message;
        }
        setFieldErrors(errs);
        return;
      }
      setFieldErrors({});
      setBusy(true);
      try {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      } catch {
        // Mensagem generica para não facilitar enumeracao de contas.
        setFormError("E-mail ou senha inválidos.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const parsed = authSignupSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      tosAccepted,
    });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "email") errs.email = issue.message;
        if (key === "password") errs.password = issue.message;
        if (key === "confirmPassword") errs.confirmPassword = issue.message;
        if (key === "fullName") errs.fullName = issue.message;
        if (key === "tosAccepted") errs.tosAccepted = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: redirectTo,
          // handle_new_user() lê esse metadata pra gravar nome e consentimento
          // já na criação do profile (0009_signup_consent.sql).
          data: { name: parsed.data.fullName, tos_accepted: true },
        },
      });
      if (error) throw error;

      // `identities` vem vazio quando o e-mail já pertencia a uma conta
      // existente (o mesmo caso ambíguo do comentário abaixo) -- só reporta
      // como cadastro novo quando o Supabase confirma que uma identidade
      // nova foi criada de verdade, senão o pixel conta reentrada como
      // registro.
      if ((data.user?.identities?.length ?? 0) > 0) {
        trackEvent("CompleteRegistration");
      }

      // Só dá pra subir a foto agora se já existe sessão (confirmação de
      // e-mail desligada no projeto) -- sem isso não há auth.uid() pra
      // policy do bucket `avatars` aceitar o upload. Com confirmação
      // exigida, o usuário adiciona a foto depois em Perfil (fluxo pronto).
      if (data.session && data.user && avatarFile) {
        await uploadSignupAvatar(data.user.id, avatarFile);
      }

      if (!data.session) {
        // `data.session` também fica null quando o e-mail já pertence a uma
        // conta existente (ex.: criada antes via Google) -- o Supabase Auth
        // devolve uma resposta sem erro nesse caso, de propósito, pra não dar
        // pista de quais e-mails já têm conta. Como os dois casos são
        // indistinguíveis aqui, o texto da tela de confirmação precisa valer
        // pros dois: não dá pra prometer "enviamos e-mail" (não é enviado
        // quando a conta já existe) nem revelar que a conta já existe.
        setPostSignupExtra(avatarFile ? "Sua foto pode ser adicionada depois, em Perfil." : null);
        setAwaitingConfirmation(true);
      }
    } catch (err) {
      setFormError((err as Error).message ?? "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setFormError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setFormError("Não foi possível iniciar o login com o Google.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Painel do mascote */}
      <section className="hidden flex-col justify-between border-r border-slate-border bg-ink-800 p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <Mascot size="sm" alt="Faro Study" />
          <span className="font-brand text-lg font-semibold text-paper">Faro Study</span>
        </div>
        <div className="flex flex-col items-start gap-6">
          <Mascot size="xl" mood="search" alt="Faro, o mascote, dando boas-vindas" />
          <div>
            <h2 className="font-display text-2xl text-paper">
              O faro certo para suas revisões.
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-muted">
              Transforme editais e textos em flashcards e deixe a repetição espaçada
              decidir o que revisar hoje.
            </p>
          </div>
        </div>
        <p className="text-2xs text-slate-muted">Repetição espaçada para concursos e idiomas</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {awaitingConfirmation ? (
            <div className="flex flex-col items-center gap-5 text-center">
              <Mascot
                size="xl"
                mood="search"
                alt="Faro de olho na caixa de entrada, esperando a confirmação chegar"
              />
              <div className="space-y-2">
                <h1 className="font-display text-2xl text-paper">Quase lá</h1>
                <p className="max-w-xs text-sm text-slate-muted">
                  Se esse e-mail ainda não tem conta, mandamos uma confirmação --
                  confira sua caixa de entrada (e o spam, por garantia). Se você já
                  tem conta, é só entrar.
                </p>
                {postSignupExtra ? (
                  <p className="max-w-xs text-2xs text-slate-muted">{postSignupExtra}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep"
              >
                Já confirmei, entrar
              </button>
              <button
                type="button"
                onClick={() => setAwaitingConfirmation(false)}
                className="text-2xs text-slate-muted underline decoration-dotted underline-offset-2 hover:text-paper"
              >
                Errou o e-mail? Tentar de novo
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-center gap-2.5 lg:hidden">
                <Mascot size="sm" alt="Faro Study" />
                <span className="font-brand text-lg font-semibold text-paper">Faro Study</span>
              </div>

              <Link
                to="/"
                className="mb-4 inline-flex items-center gap-1.5 text-2xs text-slate-muted hover:text-paper"
              >
                &larr; Voltar
              </Link>

              <h1 className="font-display text-2xl text-paper">
                {mode === "signin" ? "Entrar" : "Criar conta"}
              </h1>
              <p className="mt-1 text-sm text-slate-muted">
                {mode === "signin"
                  ? "Acesse seu painel de estudos."
                  : "Leva menos de um minuto."}
              </p>

              <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="press mt-6 flex w-full items-center justify-center gap-2.5 rounded-sm border border-slate-border bg-ink-700 py-2.5 text-sm font-medium text-paper hover:border-slate-muted disabled:opacity-60"
          >
            <GoogleMark />
            Continuar com o Google
          </button>

          <div className="my-5 flex items-center gap-3 text-2xs uppercase tracking-wider text-slate-muted">
            <span className="h-px flex-1 bg-slate-border" />
            ou
            <span className="h-px flex-1 bg-slate-border" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === "signup" ? (
              <div>
                <label htmlFor="fullName" className="mb-1 block text-sm text-slate-soft">
                  Nome completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-invalid={!!fieldErrors.fullName}
                  className={`w-full rounded-sm border bg-ink-800 px-3 py-2 text-sm text-paper outline-none focus:border-focus ${
                    fieldErrors.fullName ? "border-bad" : "border-slate-border"
                  }`}
                />
                {fieldErrors.fullName ? (
                  <p className="mt-1 text-2xs text-bad">{fieldErrors.fullName}</p>
                ) : null}
              </div>
            ) : null}

            {mode === "signup" ? (
              <div>
                <label className="mb-1 block text-sm text-slate-soft">
                  Foto de perfil <span className="text-slate-muted">(opcional)</span>
                </label>
                <div className="flex items-center gap-3">
                  <Avatar size="md" url={avatarPreviewUrl} name={fullName} />
                  <label className="press inline-flex cursor-pointer items-center gap-2 rounded-sm border border-slate-border bg-ink-800 px-3 py-2 text-sm text-paper hover:border-slate-muted">
                    <IconUpload className="h-4 w-4" />
                    {avatarFile ? "Trocar" : "Escolher"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarChange}
                      className="sr-only"
                    />
                  </label>
                </div>
                <p className="mt-1 text-2xs text-slate-muted">
                  {fieldErrors.avatar ?? "PNG, JPG ou WebP, até 2 MB. Pode adicionar depois também."}
                </p>
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-slate-soft">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                className={`w-full rounded-sm border bg-ink-800 px-3 py-2 text-sm text-paper outline-none focus:border-focus ${
                  fieldErrors.email ? "border-bad" : "border-slate-border"
                }`}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-2xs text-bad">{fieldErrors.email}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm text-slate-soft">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
                className={`w-full rounded-sm border bg-ink-800 px-3 py-2 text-sm text-paper outline-none focus:border-focus ${
                  fieldErrors.password ? "border-bad" : "border-slate-border"
                }`}
              />
              {fieldErrors.password ? (
                <p className="mt-1 text-2xs text-bad">{fieldErrors.password}</p>
              ) : null}
            </div>

            {mode === "signup" ? (
              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm text-slate-soft">
                  Confirmar senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  className={`w-full rounded-sm border bg-ink-800 px-3 py-2 text-sm text-paper outline-none focus:border-focus ${
                    fieldErrors.confirmPassword ? "border-bad" : "border-slate-border"
                  }`}
                />
                {fieldErrors.confirmPassword ? (
                  <p className="mt-1 text-2xs text-bad">{fieldErrors.confirmPassword}</p>
                ) : null}
              </div>
            ) : null}

            {mode === "signup" ? (
              <div>
                <label className="flex items-start gap-2 text-2xs text-slate-muted">
                  <input
                    type="checkbox"
                    checked={tosAccepted}
                    onChange={(e) => setTosAccepted(e.target.checked)}
                    aria-invalid={!!fieldErrors.tosAccepted}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border-slate-border bg-ink-800 text-action focus:ring-focus"
                  />
                  <span>
                    Li e aceito os{" "}
                    <Link to="/termos" className="underline underline-offset-2">
                      Termos
                    </Link>{" "}
                    e a{" "}
                    <Link to="/privacidade" className="underline underline-offset-2">
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>
                {fieldErrors.tosAccepted ? (
                  <p className="mt-1 text-2xs text-bad">{fieldErrors.tosAccepted}</p>
                ) : null}
              </div>
            ) : null}

            {formError ? (
              <p role="alert" className="rounded-sm border border-bad/40 bg-bad/10 px-3 py-2 text-2xs text-bad">
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="press w-full rounded-sm bg-action py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
            >
              {busy ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-muted">
            {mode === "signin" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
              className="text-action underline underline-offset-2"
            >
              {mode === "signin" ? "Criar agora" : "Entrar"}
            </button>
          </p>

          {mode === "signin" ? (
            <p className="mt-6 text-2xs leading-relaxed text-slate-muted">
              Ao continuar você concorda com os{" "}
              <Link to="/termos" className="underline underline-offset-2">
                Termos
              </Link>{" "}
              e a{" "}
              <Link to="/privacidade" className="underline underline-offset-2">
                Política de Privacidade
              </Link>
              .
            </p>
          ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
