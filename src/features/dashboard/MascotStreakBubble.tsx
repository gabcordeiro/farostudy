/**
 * Faro comentando sua ofensiva, no canto do heatmap de consistência.
 * Humor e mensagem escalam com o tamanho da sequência atual.
 */
import { Mascot, type MascotMood } from "@/components/Mascot";

function moodAndMessage(streak: number): { mood: MascotMood; message: string } {
  if (streak <= 0) return { mood: "yawning", message: "Bora começar? Um dia de cada vez." };
  if (streak < 3) return { mood: "searching", message: "Já começou! Não deixa esfriar." };
  if (streak < 7) return { mood: "default", message: "Ritmo pegando forma. Continue." };
  if (streak < 14) return { mood: "winking", message: "Uma semana seguida! Isso é disciplina." };
  if (streak < 30) return { mood: "cheer", message: "Duas semanas de ofensiva! Você tá craque nisso." };
  return { mood: "proud", message: "Um mês seguido! O Faro tá impressionado com você." };
}

export function MascotStreakBubble({ streak }: { streak: number }) {
  const { mood, message } = moodAndMessage(streak);
  return (
    <div className="ui-decorative flex items-center gap-2">
      <Mascot mood={mood} size="sm" alt="" />
      <div className="relative rounded-md border border-hairline bg-surface px-3 py-1.5 text-2xs text-slate-soft">
        <span
          aria-hidden="true"
          className="absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-hairline bg-surface"
        />
        {message}
      </div>
    </div>
  );
}
