/**
 * Painel admin: gerenciar usuários (papel, créditos), aprovar/rejeitar
 * solicitações de compra e editar os planos de crédito.
 */
import { useState, type FormEvent } from "react";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import { IconCoin, IconShield } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { useAdminData } from "./useAdminData";

type Tab = "users" | "requests" | "plans";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminPage() {
  const {
    users,
    requests,
    plans,
    loading,
    error,
    setRole,
    grantCredits,
    resolveRequest,
    createPlan,
    togglePlanActive,
  } = useAdminData();
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>("users");
  const [grantAmount, setGrantAmount] = useState<Record<string, string>>({});
  const [newPlan, setNewPlan] = useState({ name: "", credits: "", price: "" });
  const [savingPlan, setSavingPlan] = useState(false);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  async function handleToggleRole(userId: string, current: "user" | "admin") {
    const next = current === "admin" ? "user" : "admin";
    const ok = await setRole(userId, next);
    notify(ok ? `Papel alterado para ${next}.` : "Falha ao alterar papel.", ok ? "success" : "error");
  }

  async function handleGrant(userId: string) {
    const raw = grantAmount[userId];
    const amount = Number(raw);
    if (!amount || amount <= 0) {
      notify("Informe uma quantidade válida de créditos.", "error");
      return;
    }
    const ok = await grantCredits(userId, amount, "ajuste manual pelo admin");
    notify(ok ? `${amount} créditos concedidos.` : "Falha ao conceder créditos.", ok ? "success" : "error");
    if (ok) setGrantAmount((prev) => ({ ...prev, [userId]: "" }));
  }

  async function handleResolve(requestId: string, approve: boolean) {
    const ok = await resolveRequest(requestId, approve);
    notify(
      ok ? (approve ? "Pedido aprovado, créditos liberados." : "Pedido rejeitado.") : "Falha ao resolver pedido.",
      ok ? "success" : "error",
    );
  }

  async function handleCreatePlan(e: FormEvent) {
    e.preventDefault();
    const credits = Number(newPlan.credits);
    const priceReais = Number(newPlan.price.replace(",", "."));
    if (!newPlan.name.trim() || !credits || credits <= 0 || !priceReais || priceReais < 0) {
      notify("Preencha nome, créditos e preço validos.", "error");
      return;
    }
    setSavingPlan(true);
    const ok = await createPlan({
      name: newPlan.name.trim(),
      credits,
      priceCents: Math.round(priceReais * 100),
    });
    setSavingPlan(false);
    notify(ok ? "Plano criado." : "Falha ao criar plano.", ok ? "success" : "error");
    if (ok) setNewPlan({ name: "", credits: "", price: "" });
  }

  async function handleTogglePlan(planId: string, isActive: boolean) {
    const ok = await togglePlanActive(planId, !isActive);
    notify(ok ? "Plano atualizado." : "Falha ao atualizar plano.", ok ? "success" : "error");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <SEO title="Admin" description="Gerenciamento de usuários, créditos e planos." path="/admin" noindex />

      <header className="mb-6 flex items-center gap-3">
        <IconShield className="h-6 w-6 text-focus-soft" title="Admin" />
        <div>
          <h1 className="font-display text-2xl text-paper">Administração</h1>
          <p className="text-sm text-slate-muted">Usuários, papeis, planos e solicitações de crédito.</p>
        </div>
      </header>

      <div className="mb-5 inline-flex overflow-hidden rounded-sm border border-hairline">
        {(
          [
            { key: "users", label: "Usuários" },
            { key: "requests", label: `Solicitações${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { key: "plans", label: "Planos" },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm ${tab === key ? "bg-focus text-paper" : "bg-surface text-slate-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mb-4 text-sm text-bad">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : tab === "users" ? (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-elevated px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar url={u.avatarUrl} name={u.displayName ?? u.email} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{u.displayName || u.email}</p>
                  <p className="truncate text-2xs text-slate-muted">
                    {u.email} - desde {formatDate(u.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-sm border border-hairline px-2 py-1 text-2xs text-slate-soft">
                  <IconCoin className="h-3.5 w-3.5 text-action" />
                  {u.balance}
                </span>

                <input
                  type="number"
                  min={1}
                  placeholder="qtd"
                  aria-label={`Créditos para ${u.displayName || u.email}`}
                  value={grantAmount[u.id] ?? ""}
                  onChange={(e) => setGrantAmount((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  className="w-16 rounded-sm border border-hairline bg-surface px-2 py-1 text-2xs text-paper outline-none focus:border-focus"
                />
                <button
                  type="button"
                  onClick={() => void handleGrant(u.id)}
                  className="rounded-sm border border-hairline px-2.5 py-1 text-2xs text-slate-soft hover:border-focus hover:text-paper"
                >
                  Conceder
                </button>

                <button
                  type="button"
                  onClick={() => void handleToggleRole(u.id, u.role)}
                  className={`rounded-sm px-2.5 py-1 text-2xs font-medium ${
                    u.role === "admin" ? "bg-focus text-paper" : "border border-hairline text-slate-soft hover:text-paper"
                  }`}
                >
                  {u.role === "admin" ? "Admin" : "Tornar admin"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : tab === "requests" ? (
        requests.length === 0 ? (
          <EmptyState mood="sleepy" title="Nenhuma solicitação" description="Pedidos de compra de créditos aparecem aqui." />
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => {
              const user = users.find((u) => u.id === r.userId);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-elevated px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-paper">
                      {user?.displayName || user?.email || r.userId}
                    </p>
                    <p className="text-2xs text-slate-muted">
                      {r.planName} - {r.planCredits} créditos - {formatDate(r.createdAt)}
                    </p>
                  </div>
                  {r.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleResolve(r.id, true)}
                        className="rounded-sm bg-good px-3 py-1.5 text-2xs font-medium text-paper hover:bg-good/80"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleResolve(r.id, false)}
                        className="rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:text-paper"
                      >
                        Rejeitar
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`rounded-sm px-2.5 py-1 text-2xs font-medium ${
                        r.status === "approved" ? "bg-good/15 text-good" : "bg-bad/15 text-bad"
                      }`}
                    >
                      {r.status === "approved" ? "Aprovado" : "Rejeitado"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <div className="space-y-5">
          <form
            onSubmit={handleCreatePlan}
            className="flex flex-wrap items-end gap-3 rounded-md border border-hairline bg-elevated p-4"
          >
            <div>
              <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">Nome</label>
              <input
                value={newPlan.name}
                onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))}
                maxLength={80}
                className="w-40 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
              />
            </div>
            <div>
              <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">Créditos</label>
              <input
                type="number"
                min={1}
                value={newPlan.credits}
                onChange={(e) => setNewPlan((p) => ({ ...p, credits: e.target.value }))}
                className="w-24 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
              />
            </div>
            <div>
              <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">Preço (R$)</label>
              <input
                inputMode="decimal"
                placeholder="9,90"
                aria-label="Preço do plano em reais"
                value={newPlan.price}
                onChange={(e) => setNewPlan((p) => ({ ...p, price: e.target.value }))}
                className="w-24 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
              />
            </div>
            <button
              type="submit"
              disabled={savingPlan}
              className="rounded-sm bg-action px-4 py-2 text-sm font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
            >
              {savingPlan ? "Criando..." : "Criar plano"}
            </button>
          </form>

          <ul className="space-y-2">
            {plans.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-elevated px-4 py-3"
              >
                <div>
                  <p className="text-sm text-paper">{p.name}</p>
                  <p className="text-2xs text-slate-muted">
                    {p.credits} créditos - {formatBRL(p.priceCents)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleTogglePlan(p.id, p.isActive)}
                  className={`rounded-sm px-2.5 py-1 text-2xs font-medium ${
                    p.isActive ? "bg-good/15 text-good" : "border border-hairline text-slate-soft hover:text-paper"
                  }`}
                >
                  {p.isActive ? "Ativo" : "Inativo"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
