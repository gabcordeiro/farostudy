/**
 * Pedido de redefinição de senha. Mesmo padrão anti-enumeração do cadastro
 * (LoginPage.tsx): a mensagem de confirmação vale tanto pra e-mail com conta
 * quanto sem, então nunca revela se aquele e-mail existe.
 */
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { forgotPasswordSchema } from "@/lib/validation";
import { Mascot } from "@/components/Mascot";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "E-mail inválido");
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
    } finally {
      // Sempre mostra a mesma confirmação, com erro ou sem -- não dá pra
      // diferenciar "e-mail não existe" de "falha ao enviar" sem abrir
      // brecha de enumeração de contas.
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {sent ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <Mascot size="xl" mood="search" alt="Faro de olho na caixa de entrada" />
            <div className="space-y-2">
              <h1 className="font-display text-2xl text-paper">Confira seu e-mail</h1>
              <p className="max-w-xs text-sm text-slate-muted">
                Se esse e-mail tiver uma conta, mandamos um link pra redefinir a senha.
                Confira sua caixa de entrada (e o spam, por garantia).
              </p>
            </div>
            <Link
              to="/login"
              className="rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-action-ink hover:bg-action-deep"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 flex items-center gap-2.5">
              <Mascot size="sm" alt="Faro Study" />
              <span className="font-brand text-lg font-semibold text-paper">Faro Study</span>
            </div>

            <Link
              to="/login"
              className="mb-4 inline-flex items-center gap-1.5 text-2xs text-slate-muted hover:text-paper"
            >
              &larr; Voltar
            </Link>

            <h1 className="font-display text-2xl text-paper">Esqueceu sua senha?</h1>
            <p className="mt-1 text-sm text-slate-muted">
              Digite seu e-mail e mandamos um link pra você criar uma nova senha.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm text-slate-soft">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!fieldError}
                  className={`w-full rounded-sm border bg-ink-800 px-3 py-2 text-sm text-paper outline-none focus:border-focus ${
                    fieldError ? "border-bad" : "border-slate-border"
                  }`}
                />
                {fieldError ? <p className="mt-1 text-2xs text-bad">{fieldError}</p> : null}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="press w-full rounded-sm bg-action py-2.5 text-sm font-medium text-action-ink hover:bg-action-deep disabled:opacity-60"
              >
                {busy ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
