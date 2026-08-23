/**
 * Calendário mensal (substitui o heatmap): destaca os dias estudados, marca
 * eventos (ex.: alerta de prova) e deixa adicionar/remover eventos ao clicar
 * num dia. Mantém a ofensiva e o balão do Faro no cabeçalho.
 */
import { useMemo, useState } from "react";
import { IconFlame, IconPlus, IconTrash } from "@/components/icons";
import { useDecks } from "@/features/ai/useDecks";
import type { DayActivity } from "./dashboard.types";
import { MascotStreakBubble } from "./MascotStreakBubble";
import { useCalendarEvents, type CalendarEvent } from "./useCalendarEvents";

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
  const { events, add, remove } = useCalendarEvents();
  const { decks } = useDecks();

  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [selected, setSelected] = useState<string | null>(dayKey(today));

  // Formulário de novo evento.
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"exam" | "custom">("exam");
  const [deckId, setDeckId] = useState("");
  const [saving, setSaving] = useState(false);

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
              className={`press relative flex aspect-square flex-col items-center justify-center rounded-sm border text-sm transition-colors ${
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
              className="press inline-flex items-center gap-1 rounded-sm bg-action px-3 py-2 text-2xs font-medium text-ink-900 hover:bg-action-deep disabled:opacity-60"
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
    </section>
  );
}
