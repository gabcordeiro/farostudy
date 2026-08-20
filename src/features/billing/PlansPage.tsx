/**
 * Página de planos (créditos). Pública: visitantes veem preços, usuários
 * logados compram via Mercado Pago (Checkout Pro). O pedido manual continua
 * disponível como reserva -- um admin aprova em /admin.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Mascot } from "@/components/Mascot";
import { Skeleton } from "@/components/Skeleton";
import { IconCoin } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlans } from "./usePlans";
import { useCredits } from "./useCredits";
import { startCheckout } from "./startCheckout";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PlansPage() {
  const { user } = useAuth();
  const { balance } = useCredits();
  const { plans, requests, loading, requestPlan } = usePlans();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // Retorno do Mercado Pago. Quem credita e o webhook, nao esta navegacao --
  // por isso a mensagem de sucesso fala em "confirmando", sem prometer saldo.
  const paymentStatus = searchParams.get("pagamento");
  useEffect(() => {
    if (!paymentStatus) return;
    if (paymentStatus === "approved") {
      notify("Pagamento recebido. Assim que o Mercado Pago confirmar, seus créditos entram.", "success");
    } else if (paymentStatus === "pending") {
      notify("Pagamento pendente. Os créditos entram quando for confirmado.", "info");
    } else if (paymentStatus === "failure") {
      notify("O pagamento não foi concluído. Nada foi cobrado.", "error");
    }
  }, [paymentStatus, notify]);

  async function handleBuy(planId: string) {
    setBuyingId(planId);
    try {
      const { checkoutUrl } = await startCheckout(planId);
      window.location.href = checkoutUrl;
    } catch (err) {
      setBuyingId(null);
      notify((err as Error).message ?? "Não foi possível abrir o checkout.", "error");
    }
  }

  async function handleRequest(planId: string) {
    const ok = await requestPlan(planId);
    notify(
      ok
        ? "Pedido enviado. Um admin vai aprovar e os créditos caem na sua conta."
        : "Não foi possível enviar o pedido agora.",
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
        description="Planos de créditos do Faro Study para gerar cards e quizzes com IA."
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
          <h1 className="font-display text-3xl text-paper">Planos de créditos</h1>
          <p className="mt-2 text-sm text-slate-muted">
            Cada geração de cards ou quiz com IA consome 1 crédito. Escolha um pacote e
            continue estudando sem parar.
          </p>
          {user && balance !== null ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-hairline bg-elevated px-3 py-1.5 text-sm text-paper">
              <IconCoin className="h-4 w-4 text-action" />
              Você tem {balance} {balance === 1 ? "crédito" : "créditos"}
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
                      {plan.credits} créditos
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
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={buyingId !== null}
                          onClick={() => void handleBuy(plan.id)}
                          className="w-full rounded-sm bg-action py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
                        >
                          {buyingId === plan.id ? "Abrindo checkout..." : "Comprar"}
                        </button>
                        <p className="mt-2 text-center text-2xs text-slate-muted">Pix ou cartão</p>
                        {pending ? (
                          <p className="mt-2 text-center text-2xs text-focus-soft">
                            Você já tem um pedido manual aguardando aprovação.
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleRequest(plan.id)}
                            className="mt-2 block w-full text-center text-2xs text-slate-muted underline decoration-dotted underline-offset-2 hover:text-slate-soft"
                          >
                            Pedir aprovação manual
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-2xs text-slate-muted">
          Pagamento por Pix ou cartão via Mercado Pago. Os créditos entram na sua conta
          assim que o pagamento é confirmado — em geral na hora. Se preferir, você ainda
          pode pedir aprovação manual e um administrador libera os créditos.
        </p>
      </section>
    </main>
  );
}
