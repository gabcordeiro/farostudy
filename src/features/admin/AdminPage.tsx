/**
 * Painel admin: gerenciar usuários (papel, créditos), aprovar/rejeitar
 * solicitações de compra e editar os planos de crédito.
 */
import { useState, type FormEvent } from "react";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import { IconCoin, IconPencil, IconShield } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { useAdminData, type AdminPlanRow } from "./useAdminData";
import { AdminVisualLab } from "./AdminVisualLab";
import { AdminAppearance } from "./AdminAppearance";

type Tab = "users" | "requests" | "plans" | "suggestions" | "errors" | "visuals" | "appearance" | "features";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
    errorLogs,
    suggestions,
    quizChallengesEnabled,
    loading,
    error,
    setRole,
    grantCredits,
    resolveRequest,
    createPlan,
    updatePlan,
    togglePlanActive,
    setQuizChallengesEnabled,
  } = useAdminData();
  const { notify } = useToast();
  const [savingFeature, setSavingFeature] = useState(false);
  const [tab, setTab] = useState<Tab>("users");
  const [grantAmount, setGrantAmount] = useState<Record<string, string>>({});
  const [newPlan, setNewPlan] = useState({ name: "", credits: "", price: "" });
  const [savingPlan, setSavingPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanDraft, setEditPlanDraft] = useState({ name: "", credits: "", price: "" });
  const [savingPlanEdit, setSavingPlanEdit] = useState(false);

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

  async function handleToggleQuizChallenges() {
    setSavingFeature(true);
    const ok = await setQuizChallengesEnabled(!quizChallengesEnabled);
    setSavingFeature(false);
    notify(ok ? "Recurso atualizado." : "Falha ao atualizar o recurso.", ok ? "success" : "error");
  }

  function startEditPlan(p: AdminPlanRow) {
    setEditingPlanId(p.id);
    setEditPlanDraft({
      name: p.name,
      credits: String(p.credits),
      price: (p.priceCents / 100).toFixed(2).replace(".", ","),
    });
  }

  async function handleSavePlanEdit(planId: string) {
    const credits = Number(editPlanDraft.credits);
    const priceReais = Number(editPlanDraft.price.replace(",", "."));
    if (!editPlanDraft.name.trim() || !credits || credits <= 0 || !priceReais || priceReais < 0) {
      notify("Preencha nome, créditos e preço validos.", "error");
      return;
    }
    setSavingPlanEdit(true);
    const ok = await updatePlan(planId, {
      name: editPlanDraft.name.trim(),
      credits,
      priceCents: Math.round(priceReais * 100),
    });
    setSavingPlanEdit(false);
    notify(ok ? "Plano atualizado." : "Falha ao atualizar plano.", ok ? "success" : "error");
    if (ok) setEditingPlanId(null);
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

      <div className="mb-5 flex overflow-x-auto rounded-sm border border-hairline">
        {(
          [
            { key: "users", label: "Usuários" },
            { key: "requests", label: `Solicitações${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { key: "plans", label: "Planos" },
            { key: "suggestions", label: `Sugestões${suggestions.length > 0 ? ` (${suggestions.length})` : ""}` },
            { key: "errors", label: `Erros${errorLogs.length > 0 ? ` (${errorLogs.length})` : ""}` },
            { key: "visuals", label: "Visuais" },
            { key: "appearance", label: "Aparência" },
            { key: "features", label: "Recursos" },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`press shrink-0 whitespace-nowrap px-4 py-2 text-sm ${tab === key ? "bg-focus text-paper" : "bg-surface text-slate-soft"}`}
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
      ) : (
      <div key={tab} className="animate-fade-in">
      {tab === "users" ? (
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
      ) : tab === "suggestions" ? (
        suggestions.length === 0 ? (
          <EmptyState
            mood="sleepy"
            title="Nenhuma sugestão ainda"
            description="Sugestões enviadas pelos usuários em Ajuda aparecem aqui."
          />
        ) : (
          <ul className="space-y-2">
            {suggestions.map((s) => {
              const user = users.find((u) => u.id === s.userId);
              return (
                <li key={s.id} className="rounded-md border border-hairline bg-elevated px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-2xs text-slate-muted">
                      {user?.displayName || user?.email || s.userId}
                    </p>
                    <div className="flex items-center gap-2">
                      {s.emailSent ? (
                        <span className="rounded-sm bg-good/15 px-2 py-0.5 text-2xs text-good">
                          E-mail enviado
                        </span>
                      ) : null}
                      <span className="text-2xs text-slate-muted">{formatDateTime(s.createdAt)}</span>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-paper">{s.message}</p>
                </li>
              );
            })}
          </ul>
        )
      ) : tab === "errors" ? (
        errorLogs.length === 0 ? (
          <EmptyState
            mood="sleepy"
            title="Nenhum erro registrado"
            description="Falhas técnicas de geração por IA (Gemini fora do ar, etc.) aparecem aqui, com o detalhe que o cliente não vê."
          />
        ) : (
          <ul className="space-y-2">
            {errorLogs.map((e) => {
              const user = users.find((u) => u.id === e.userId);
              return (
                <li key={e.id} className="rounded-md border border-hairline bg-elevated px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-sm border border-bad/40 bg-bad/10 px-2 py-0.5 font-mono text-2xs text-bad">
                        {e.statusCode}
                      </span>
                      <span className="text-sm text-paper">{e.source}</span>
                      <span className="font-mono text-2xs text-slate-muted">
                        {e.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-2xs text-slate-muted">{formatDateTime(e.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-2xs text-slate-muted">
                    {user?.displayName || user?.email || e.userId}
                  </p>
                  <p className="mt-2 break-words font-mono text-2xs text-slate-soft">{e.message}</p>
                </li>
              );
            })}
          </ul>
        )
      ) : tab === "visuals" ? (
        <AdminVisualLab />
      ) : tab === "appearance" ? (
        <AdminAppearance />
      ) : tab === "features" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-elevated px-4 py-3">
            <div>
              <p className="text-sm text-paper">Quiz competitivo (desafiar amigos)</p>
              <p className="mt-0.5 text-2xs text-slate-muted">
                Enquanto desativado, ninguém vê o botão "Desafiar amigos" e links de desafio existentes
                mostram uma mensagem de pausa.
              </p>
            </div>
            <button
              type="button"
              disabled={savingFeature}
              onClick={() => void handleToggleQuizChallenges()}
              className={`rounded-sm px-3 py-1.5 text-2xs font-medium disabled:opacity-60 ${
                quizChallengesEnabled
                  ? "bg-good/15 text-good"
                  : "border border-hairline text-slate-soft hover:text-paper"
              }`}
            >
              {quizChallengesEnabled ? "Ativado" : "Desativado"}
            </button>
          </div>
        </div>
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
            {plans.map((p) =>
              editingPlanId === p.id ? (
                <li
                  key={p.id}
                  className="flex flex-wrap items-end gap-3 rounded-md border border-focus bg-elevated p-4 animate-fade-in"
                >
                  <div>
                    <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">Nome</label>
                    <input
                      value={editPlanDraft.name}
                      onChange={(e) => setEditPlanDraft((d) => ({ ...d, name: e.target.value }))}
                      maxLength={80}
                      className="w-40 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">Créditos</label>
                    <input
                      type="number"
                      min={1}
                      value={editPlanDraft.credits}
                      onChange={(e) => setEditPlanDraft((d) => ({ ...d, credits: e.target.value }))}
                      className="w-24 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-2xs uppercase tracking-wider text-slate-muted">Preço (R$)</label>
                    <input
                      inputMode="decimal"
                      aria-label="Preço do plano em reais"
                      value={editPlanDraft.price}
                      onChange={(e) => setEditPlanDraft((d) => ({ ...d, price: e.target.value }))}
                      className="w-24 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSavePlanEdit(p.id)}
                    disabled={savingPlanEdit}
                    className="rounded-sm bg-focus px-4 py-2 text-sm font-medium text-paper hover:bg-focus-deep disabled:opacity-60"
                  >
                    {savingPlanEdit ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPlanId(null)}
                    className="rounded-sm border border-hairline px-4 py-2 text-sm text-slate-soft hover:text-paper"
                  >
                    Cancelar
                  </button>
                </li>
              ) : (
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditPlan(p)}
                      aria-label={`Editar plano ${p.name}`}
                      className="rounded-sm p-1.5 text-slate-muted transition-colors duration-150 hover:bg-surface hover:text-paper"
                    >
                      <IconPencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleTogglePlan(p.id, p.isActive)}
                      className={`rounded-sm px-2.5 py-1 text-2xs font-medium ${
                        p.isActive ? "bg-good/15 text-good" : "border border-hairline text-slate-soft hover:text-paper"
                      }`}
                    >
                      {p.isActive ? "Ativo" : "Inativo"}
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
      </div>
      )}
    </div>
  );
}
