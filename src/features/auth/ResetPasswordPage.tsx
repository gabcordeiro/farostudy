/**
 * Tela de destino do link de "esqueci minha senha". O Supabase troca o
 * código da URL por uma sessão de recuperação automaticamente
 * (detectSessionInUrl, ver lib/supabase.ts) -- só esperamos essa sessão
 * aparecer antes de mostrar o formulário de nova senha. Rota dedicada
 * (não reaproveita /auth/callback) porque aqui o destino não é o painel,
 * é definir a senha nova primeiro.
 */
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { resetPasswordSchema } from "@/lib/validation";
import { Mascot } from "@/components/Mascot";

type Status = "waiting" | "ready" | "expired" | "done";

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("waiting");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const markReady = () => active && setStatus((s) => (s === "waiting" ? "ready" : s));

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) markReady();
    });

    // Link expirado/inválido: sem sessão depois de alguns segundos.
    const timer = window.setTimeout(() => {
      if (active) setStatus((s) => (s === "waiting" ? "expired" : s));
    }, 8000);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "password") errs.password = issue.message;
        if (key === "confirmPassword") errs.confirmPassword = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
      setStatus("done");
    } catch (err) {
      setFormError((err as Error).message ?? "Não foi possível atualizar a senha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {status === "waiting" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <Mascot size="lg" mood="sleepy" alt="Faro conferindo seu link de recuperação" />
            <p className="text-sm text-slate-muted">Confirmando seu link...</p>
          </div>
        ) : status === "expired" ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <Mascot size="xl" mood="sleepy" alt="Faro triste, o link expirou" />
            <div className="space-y-2">
              <h1 className="font-display text-2xl text-paper">Link expirado</h1>
              <p className="max-w-xs text-sm text-slate-muted">
                Esse link de redefinição não é mais válido. Peça um novo pra continuar.
              </p>
            </div>
            <Link
              to="/esqueci-senha"
              className="rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep"
            >
              Pedir novo link
            </Link>
          </div>
        ) : status === "done" ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <Mascot size="xl" mood="cheer" alt="Faro comemorando, senha atualizada" />
            <div className="space-y-2">
              <h1 className="font-display text-2xl text-paper">Senha atualizada</h1>
              <p className="max-w-xs text-sm text-slate-muted">
                Sua senha foi redefinida com sucesso.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/painel", { replace: true })}
              className="rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep"
            >
              Ir para o painel
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 flex items-center gap-2.5">
              <Mascot size="sm" alt="Faro Study" />
              <span className="font-brand text-lg font-semibold text-paper">Faro Study</span>
            </div>

            <h1 className="font-display text-2xl text-paper">Crie uma nova senha</h1>
            <p className="mt-1 text-sm text-slate-muted">Escolha uma senha nova para sua conta.</p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="password" className="mb-1 block text-sm text-slate-soft">
                  Nova senha
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
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

              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm text-slate-soft">
                  Confirmar nova senha
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
                {busy ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
