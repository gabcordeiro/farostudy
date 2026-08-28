/**
 * Calendário mensal (substitui o heatmap): destaca os dias estudados, marca
 * eventos (ex.: alerta de prova) e deixa adicionar/remover eventos ao clicar
 * num dia. Mantém a ofensiva e o balão do Faro no cabeçalho.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IconFlame, IconPlus, IconTrash, IconWand } from "@/components/icons";
import { Mascot } from "@/components/Mascot";
import { ErrorModal } from "@/components/ErrorModal";
import { useToast } from "@/components/Toast";
import { AppFunctionError } from "@/lib/functionError";
import { useDecks } from "@/features/ai/useDecks";
import { useCredits } from "@/features/billing/useCredits";
import type { DayActivity } from "./dashboard.types";
import { MascotStreakBubble } from "./MascotStreakBubble";
import { useCalendarEvents, type CalendarEvent } from "./useCalendarEvents";
import { generateSchedule } from "./generateSchedule";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface Props {
  activity: DayActivity[];
  currentStreak: number;
  longestStreak: number;
}

export function StudyCalendar({ activity, currentStreak, longestStreak }: Props) {
  const { events, add, addMany, remove } = useCalendarEvents();
  const { decks } = useDecks();
  const { balance } = useCredits();
  const { notify } = useToast();

  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [selected, setSelected] = useState<string | null>(dayKey(today));

  // Formulário de novo evento.
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"exam" | "custom">("exam");
  const [deckId, setDeckId] = useState("");
  const [saving, setSaving] = useState(false);

  // Cronograma gerado por IA.
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDeckId, setScheduleDeckId] = useState("");
  const [scheduleExamDate, setScheduleExamDate] = useState("");
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleNeedsCredits, setScheduleNeedsCredits] = useState(false);
  const [scheduleErrorModal, setScheduleErrorModal] = useState<{ code: string | null } | null>(null);

  const activityMap = useMemo(() => new Map(activity.map((a) => [a.day, a.reviews])), [activity]);
  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const lead = first.getDay(); // 0=Dom
    const out: (Date | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(view.year, view.month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [view]);

  const todayKey = dayKey(today);
  const selectedEvents = selected ? eventsByDay.get(selected) ?? [] : [];

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const upcoming = useMemo(
    () => events.filter((e) => e.date >= todayKey).slice(0, 4),
    [events, todayKey],
  );

  async function handleAdd() {
    if (!selected || !title.trim()) return;
    setSaving(true);
    const ok = await add({ title, date: selected, kind, deckId: deckId || null });
    setSaving(false);
    if (ok) {
      setTitle("");
      setDeckId("");
    }
  }

  async function handleGenerateSchedule() {
    setScheduleError(null);
    setScheduleNeedsCredits(false);
    if (!scheduleDeckId) {
      setScheduleError("Escolha uma trilha.");
      return;
    }
    if (!scheduleExamDate) {
      setScheduleError("Escolha a data da prova.");
      return;
    }
    setScheduleBusy(true);
    try {
      const res = await generateSchedule({ deckId: scheduleDeckId, examDate: scheduleExamDate });
      const examEvent = { title: `Prova de ${res.deckTitle}`, date: res.examDate, kind: "exam" as const, deckId: scheduleDeckId };
      const sessionEvents = res.sessions.map((s) => ({
        title: s.title,
        date: s.date,
        kind: "custom" as const,
        deckId: scheduleDeckId,
      }));
      const ok = await addMany([examEvent, ...sessionEvents]);
      if (ok) {
        notify(`Cronograma de "${res.deckTitle}" adicionado: ${res.sessions.length} sessões + a prova.`, "success");
        setScheduleOpen(false);
        setScheduleExamDate("");
        setSelected(res.examDate);
        setView({ year: Number(res.examDate.slice(0, 4)), month: Number(res.examDate.slice(5, 7)) - 1 });
      } else {
        setScheduleError("O cronograma foi gerado, mas falhou ao salvar no calendário.");
      }
    } catch (err) {
      // code só vem preenchido quando o servidor logou um erro técnico
      // (ex.: falha do Gemini) -- aí sim vira o modal genérico. Erros de
      // validação (400) e crédito insuficiente (402) já trazem uma
      // mensagem segura e específica, então ficam inline.
      if (err instanceof AppFunctionError && err.insufficientCredits) {
        setScheduleError(err.message);
        setScheduleNeedsCredits(true);
      } else if (err instanceof AppFunctionError && err.code) {
        setScheduleErrorModal({ code: err.code });
      } else if (err instanceof AppFunctionError) {
        setScheduleError(err.message);
      } else {
        setScheduleError((err as Error).message ?? "Falha ao gerar o cronograma.");
      }
    } finally {
      setScheduleBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-border bg-ink-700 p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-paper">Calendário</h2>
          <p className="text-2xs uppercase tracking-wider text-slate-muted">
            Dias estudados e seus eventos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <MascotStreakBubble streak={currentStreak} />
          <div className="flex items-center gap-2">
            <IconFlame className="text-action" title="Ofensiva atual" />
            <span className="text-2xl font-semibold tabular-nums text-paper">{currentStreak}</span>
            <span className="hidden text-xs text-slate-muted sm:inline">dias · recorde {longestStreak}</span>
          </div>
        </div>
      </header>

      {/* Cronograma gerado por IA */}
      <div className="mb-4 rounded-md border border-hairline bg-elevated p-3">
        <button
          type="button"
          onClick={() => setScheduleOpen((v) => !v)}
          className="press flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2 text-sm text-paper">
            <IconWand className="h-4 w-4 text-focus-soft" />
            Gerar cronograma de estudo com IA
          </span>
          <span className="text-slate-muted">{scheduleOpen ? "▴" : "▾"}</span>
        </button>

        {scheduleOpen ? (
          <div className="mt-3 animate-fade-in space-y-3">
            <p className="text-2xs text-slate-muted">
              Escolha a trilha e a data da prova: o Faro espalha sessões de revisão até lá e já
              marca a prova no calendário.
            </p>

            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 text-2xs text-slate-muted">
                Trilha
                <select
                  value={scheduleDeckId}
                  onChange={(e) => setScheduleDeckId(e.target.value)}
                  className="mt-1 w-full rounded-sm border border-hairline bg-surface px-2 py-2 text-sm text-paper outline-none focus:border-focus"
                >
                  <option value="">Selecione...</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-2xs text-slate-muted">
                Data da prova
                <input
                  type="date"
                  value={scheduleExamDate}
                  min={dayKey(new Date(today.getTime() + 2 * 86_400_000))}
                  onChange={(e) => setScheduleExamDate(e.target.value)}
                  className="mt-1 rounded-sm border border-hairline bg-surface px-2 py-2 text-sm text-paper outline-none focus:border-focus"
                />
              </label>
            </div>

            {scheduleBusy ? (
              <div className="flex items-center gap-2">
                <Mascot mood="searching" size="sm" alt="Faro farejando, montando o cronograma" />
                <p className="text-sm text-slate-muted">O Faro está montando o cronograma...</p>
              </div>
            ) : (
              <>
                {scheduleError ? (
                  <p role="alert" className="rounded-sm border border-bad/40 bg-bad/10 px-3 py-2 text-2xs text-bad">
                    {scheduleError}
                    {scheduleNeedsCredits ? (
                      <>
                        {" "}
                        <Link to="/planos" className="underline underline-offset-2">
                          Ver planos
                        </Link>
                      </>
                    ) : null}
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-2">
                  <p className={`text-2xs ${balance === 0 ? "text-warn" : "text-slate-muted"}`}>
                    Essa geração usa 1 crédito
                    {balance !== null ? ` · você tem ${balance}` : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleGenerateSchedule()}
                    className="press inline-flex items-center gap-1 rounded-sm bg-action px-3 py-2 text-2xs font-medium text-action-ink hover:bg-action-deep"
                  >
                    <IconWand className="h-3.5 w-3.5" />
                    Gerar cronograma
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Navegação do mês */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Mês anterior"
          className="press rounded-sm border border-hairline px-2 py-1 text-slate-soft hover:text-paper"
        >
          ‹
        </button>
        <span className="font-display text-sm text-paper">
          {MONTHS[view.month]} {view.year}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Próximo mês"
          className="press rounded-sm border border-hairline px-2 py-1 text-slate-soft hover:text-paper"
        >
          ›
        </button>
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WD.map((w) => (
          <div key={w} className="py-1 text-2xs text-slate-muted">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const key = dayKey(d);
          const reviews = activityMap.get(key) ?? 0;
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selected;
          const studied = reviews > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`press relative flex h-11 flex-col items-center justify-center rounded-sm border text-sm transition-colors sm:h-14 ${
                isSelected
                  ? "border-focus text-paper"
                  : studied
                    ? "border-transparent bg-focus/25 text-paper"
                    : "border-transparent text-slate-soft hover:bg-surface"
              } ${isToday ? "ring-1 ring-action" : ""}`}
            >
              {d.getDate()}
              {dayEvents.length > 0 ? (
                <span
                  className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                    dayEvents.some((e) => e.kind === "exam") ? "bg-action" : "bg-focus-soft"
                  }`}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Painel do dia selecionado */}
      {selected ? (
        <div className="mt-4 rounded-md border border-hairline bg-elevated p-4">
          <p className="mb-2 text-sm text-paper">
            {new Date(`${selected}T00:00:00`).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
            <span className="ml-2 text-2xs text-slate-muted">
              {(activityMap.get(selected) ?? 0) > 0
                ? `${activityMap.get(selected)} revisões`
                : "sem estudo"}
            </span>
          </p>

          {selectedEvents.length > 0 ? (
            <ul className="mb-3 space-y-1.5">
              {selectedEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2 rounded-sm border border-hairline bg-surface px-2.5 py-1.5"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${e.kind === "exam" ? "bg-action" : "bg-focus-soft"}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-paper">{e.title}</span>
                  {e.kind === "exam" ? (
                    <span className="rounded-sm bg-action/15 px-1.5 py-0.5 text-[10px] text-action">prova</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void remove(e.id)}
                    aria-label="Remover evento"
                    className="press shrink-0 rounded-sm p-1 text-slate-muted hover:text-bad"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Novo evento */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Novo evento (ex.: Prova de Redes)"
              maxLength={120}
              className="min-w-0 flex-1 rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-focus"
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "exam" | "custom")}
              className="rounded-sm border border-hairline bg-surface px-2 py-2 text-2xs text-paper outline-none focus:border-focus"
            >
              <option value="exam">Prova</option>
              <option value="custom">Outro</option>
            </select>
            {decks.length > 0 ? (
              <select
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                className="max-w-[10rem] rounded-sm border border-hairline bg-surface px-2 py-2 text-2xs text-paper outline-none focus:border-focus"
              >
                <option value="">Sem trilha</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={saving || !title.trim()}
              className="press inline-flex items-center gap-1 rounded-sm bg-action px-3 py-2 text-2xs font-medium text-action-ink hover:bg-action-deep disabled:opacity-60"
            >
              <IconPlus className="h-3.5 w-3.5" />
              Adicionar
            </button>
          </div>
        </div>
      ) : null}

      {/* Próximos eventos */}
      {upcoming.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-2xs uppercase tracking-wider text-slate-muted">Próximos</p>
          <ul className="flex flex-wrap gap-2">
            {upcoming.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-1.5 rounded-sm border border-hairline bg-elevated px-2.5 py-1 text-2xs text-slate-soft"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${e.kind === "exam" ? "bg-action" : "bg-focus-soft"}`}
                  aria-hidden="true"
                />
                <span className="text-paper">{e.title}</span>
                <span className="text-slate-muted">
                  {new Date(`${e.date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ErrorModal
        open={scheduleErrorModal !== null}
        code={scheduleErrorModal?.code}
        onClose={() => setScheduleErrorModal(null)}
      />
    </section>
  );
}
