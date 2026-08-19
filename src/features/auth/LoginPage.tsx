/**
 * Login / Cadastro (Supabase Auth): email+senha e Google OAuth.
 * Mascote ao lado do formulario (regra de UI #1). Validacao Zod + estados de erro.
 */
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { authEmailSchema } from "@/lib/validation";
import { useAuth } from "./AuthProvider";
import { Mascot } from "@/components/Mascot";

type Mode = "signin" | "signup";
type LocationState = { from?: string };

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

export function LoginPage() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? "/painel";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to={from} replace />;

  const redirectTo = `${window.location.origin}/auth/callback`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);

    const parsed = authEmailSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
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
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Enviamos um e-mail de confirmacao. Verifique sua caixa de entrada.");
        }
      }
    } catch (err) {
      // Mensagem generica para nao facilitar enumeracao de contas.
      setFormError(
        mode === "signin"
          ? "E-mail ou senha invalidos."
          : (err as Error).message ?? "Nao foi possivel criar a conta.",
      );
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
      setFormError("Nao foi possivel iniciar o login com o Google.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Painel do mascote */}
      <section className="hidden flex-col justify-between border-r border-slate-border bg-ink-800 p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <Mascot size="sm" alt="Faro Cards" />
          <span className="font-display text-lg text-paper">Faro Cards</span>
        </div>
        <div className="flex flex-col items-start gap-6">
          <Mascot size="xl" mood="search" alt="Faro, o mascote, dando boas-vindas" />
          <div>
            <h2 className="font-display text-2xl text-paper">
              O faro certo para suas revisoes.
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-muted">
              Transforme editais e textos em flashcards e deixe a repeticao espacada
              decidir o que revisar hoje.
            </p>
          </div>
        </div>
        <p className="text-2xs text-slate-muted">Repeticao espacada para concursos e idiomas</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Mascot size="sm" alt="Faro Cards" />
            <span className="font-display text-lg text-paper">Faro Cards</span>
          </div>

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
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-sm border border-slate-border bg-ink-700 py-2.5 text-sm font-medium text-paper hover:border-slate-muted disabled:opacity-60"
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

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-sm bg-action py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
            >
              {busy ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-muted">
            {mode === "signin" ? "Nao tem conta?" : "Ja tem conta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setFormError(null);
                setNotice(null);
              }}
              className="text-action underline underline-offset-2"
            >
              {mode === "signin" ? "Criar agora" : "Entrar"}
            </button>
          </p>

          <p className="mt-6 text-2xs leading-relaxed text-slate-muted">
            Ao continuar voce concorda com os{" "}
            <Link to="/termos" className="underline underline-offset-2">
              Termos
            </Link>{" "}
            e a{" "}
            <Link to="/privacidade" className="underline underline-offset-2">
              Politica de Privacidade
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
