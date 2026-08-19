/**
 * Pagina de planos (creditos). Publica: visitantes veem precos, usuarios
 * logados podem solicitar -- um admin aprova em /admin ate o gateway de
 * pagamento real (Stripe ou similar) ser conectado com as chaves do dono.
 */
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Mascot } from "@/components/Mascot";
import { Skeleton } from "@/components/Skeleton";
import { IconCoin } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlans } from "./usePlans";
import { useCredits } from "./useCredits";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PlansPage() {
  const { user } = useAuth();
  const { balance } = useCredits();
  const { plans, requests, loading, requestPlan } = usePlans();
  const { notify } = useToast();

  async function handleRequest(planId: string) {
    const ok = await requestPlan(planId);
    notify(
      ok
        ? "Pedido enviado. Um admin vai aprovar e os creditos caem na sua conta."
        : "Nao foi possivel enviar o pedido agora.",
      ok ? "success" : "error",
    );
  }

  function statusFor(planId: string) {
    return requests.find((r) => r.planId === planId && r.status === "pending");
  }

  return (
    <main className="min-h-screen">
      <SEO
        title="Planos"
        description="Planos de creditos do Faro Study para gerar cards e quizzes com IA."
        path="/planos"
      />

      <header className="border-b border-hairline px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Mascot size="sm" alt="Faro Study" />
            <span className="font-display text-lg text-paper">Faro Study</span>
          </Link>
          {user ? (
            <Link to="/painel" className="text-sm text-slate-soft hover:text-paper">
              Voltar ao painel
            </Link>
          ) : (
            <Link to="/login" className="text-sm text-slate-soft hover:text-paper">
              Entrar
            </Link>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="max-w-xl">
          <h1 className="font-display text-3xl text-paper">Planos de creditos</h1>
          <p className="mt-2 text-sm text-slate-muted">
            Cada geracao de cards ou quiz com IA consome 1 credito. Escolha um pacote e
            continue estudando sem parar.
          </p>
          {user && balance !== null ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-hairline bg-elevated px-3 py-1.5 text-sm text-paper">
              <IconCoin className="h-4 w-4 text-action" />
              Voce tem {balance} {balance === 1 ? "credito" : "creditos"}
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const pending = statusFor(plan.id);
              return (
                <div
                  key={plan.id}
                  className="flex flex-col justify-between rounded-md border border-hairline bg-elevated p-6"
                >
                  <div>
                    <h2 className="font-display text-lg text-paper">{plan.name}</h2>
                    <p className="mt-3 font-display text-3xl text-paper">{formatBRL(plan.priceCents)}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-muted">
                      <IconCoin className="h-4 w-4 text-action" />
                      {plan.credits} creditos
                    </p>
                  </div>
                  <div className="mt-6">
                    {!user ? (
                      <Link
                        to="/login"
                        className="block rounded-sm border border-hairline py-2.5 text-center text-sm text-paper hover:border-focus"
                      >
                        Entrar para comprar
                      </Link>
                    ) : pending ? (
                      <p className="rounded-sm border border-focus/40 bg-focus/10 py-2.5 text-center text-2xs text-focus-soft">
                        Pedido enviado, aguardando aprovacao
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleRequest(plan.id)}
                        className="w-full rounded-sm bg-action py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep"
                      >
                        Solicitar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-2xs text-slate-muted">
          Pagamento automatico chega em breve. Por enquanto, seu pedido e revisado
          manualmente e os creditos sao liberados na sua conta assim que aprovado.
        </p>
      </section>
    </main>
  );
}
