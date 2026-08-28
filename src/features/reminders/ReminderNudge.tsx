/**
 * Barra discreta pedindo pra ativar os lembretes por push -- não um pop-up
 * bloqueante, e não pergunta a permissão real do navegador até a pessoa
 * clicar "Ativar" (pedir de cara, sem esse passo intermediário, tem taxa de
 * aceite baixa e, se ela clicar "bloquear" sem querer, o navegador nunca
 * mais deixa perguntar de novo -- fica queimado).
 *
 * Aparece na primeira vez que a pessoa chega no painel (conta nova, nunca
 * dispensou) e, se ela fechar sem ativar, some por 4 dias antes de voltar a
 * aparecer -- controlado só por uma data em localStorage, o mesmo mecanismo
 * cobre as duas partes do pedido (primeira vez + repetir depois).
 */
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { IconBell, IconClose } from "@/components/icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/useProfile";
import { enablePush, pushSupported } from "./push";

const DISMISS_KEY = "faro.reminder-nudge-dismissed-at.v1";
const SNOOZE_MS = 4 * 24 * 60 * 60 * 1000; // 4 dias

function shouldShow(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return true;
  const last = Number(raw);
  return !Number.isFinite(last) || Date.now() - last >= SNOOZE_MS;
}

function snooze() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

interface Props {
  /** Não mostra em cima do tour de boas-vindas -- muita coisa pra uma conta nova de uma vez. */
  suppressed?: boolean;
}

export function ReminderNudge({ suppressed }: Props) {
  const { user } = useAuth();
  const { profile, update } = useProfile();
  const { notify } = useToast();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (suppressed || !profile || profile.reminder_enabled || !pushSupported()) {
      setVisible(false);
      return;
    }
    setVisible(shouldShow());
  }, [suppressed, profile]);

  function dismiss() {
    snooze();
    setVisible(false);
  }

  async function activate() {
    if (!user) return;
    setBusy(true);
    const ok = await enablePush(user.id);
    if (ok) {
      await update({
        reminder_enabled: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      notify("Lembretes ativados. Você será avisado quando tiver cards para revisar.", "success");
      setVisible(false);
    } else {
      notify("Não foi possível ativar -- confira a permissão de notificações do navegador.", "error");
      snooze();
      setVisible(false);
    }
    setBusy(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Ativar lembretes de estudo"
      // No mobile fica ACIMA da barra de abas (h-safe-nav = 4rem + área
      // segura), senão cobre a navegação -- no desktop não tem barra
      // inferior, então flutua no canto normalmente.
      className="animate-rise-in fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-hairline bg-elevated px-4 py-3 shadow-pop sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-sm sm:rounded-md sm:border"
    >
      <div className="flex items-start gap-3">
        <IconBell className="mt-0.5 h-5 w-5 shrink-0 text-focus-soft" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-paper">Quer um lembrete quando tiver cards pra revisar?</p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void activate()}
              className="press rounded-sm bg-action px-3 py-1.5 text-2xs font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
            >
              {busy ? "Ativando..." : "Ativar"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="press rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:border-focus"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar aviso de lembretes"
          className="shrink-0 text-slate-muted hover:text-paper"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
