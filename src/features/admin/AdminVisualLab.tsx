/**
 * Laboratório visual (admin): dispara e revisa as animações/efeitos do app
 * sem precisar reproduzir o fluxo real. Útil para conferir se o confete está
 * funcionando na produção (a CSP já quebrou ele uma vez) e para ver os moods
 * do mascote lado a lado.
 */
import { useEffect, useState } from "react";
import { Mascot, type MascotMood } from "@/components/Mascot";
import { burst, celebrate } from "@/lib/confetti";
import { useToast } from "@/components/Toast";

const MOODS: MascotMood[] = [
  "default",
  "search",
  "searching",
  "sleepy",
  "yawning",
  "cheer",
  "proud",
  "winking",
  "playful",
];

const ANIMS: { name: string; cls: string; label: string }[] = [
  { name: "rise-in", cls: "animate-rise-in", label: "Subida (rise-in)" },
  { name: "fade-in", cls: "animate-fade-in", label: "Fade" },
  { name: "toast-in", cls: "animate-toast-in", label: "Toast" },
];

export function AdminVisualLab() {
  const { notify } = useToast();
  const [reduced, setReduced] = useState(false);
  // Chave que remonta os blocos de animação para reproduzir a entrada.
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="space-y-6">
      {/* Diagnóstico */}
      <div className="rounded-md border border-hairline bg-elevated p-4">
        <p className="text-2xs uppercase tracking-wider text-slate-muted">Diagnóstico</p>
        <p className="mt-1 text-sm text-slate-soft">
          prefers-reduced-motion:{" "}
          <span className={reduced ? "font-medium text-warn" : "font-medium text-good"}>
            {reduced ? "LIGADO" : "desligado"}
          </span>
          {reduced ? (
            <span className="block text-2xs text-slate-muted">
              Com isso ligado no seu sistema, o app suprime animações e o confete não dispara
              (exceto os botões de teste abaixo, que forçam). É a explicação mais comum para
              "não vejo animação nenhuma".
            </span>
          ) : null}
        </p>
      </div>

      {/* Confete */}
      <div className="rounded-md border border-hairline bg-elevated p-4">
        <p className="mb-3 text-2xs uppercase tracking-wider text-slate-muted">Confete</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => celebrate({ force: true })}
            className="press rounded-sm bg-action px-4 py-2 text-sm font-medium text-action-ink hover:bg-action-deep"
          >
            Celebração (fim de quiz/sessão)
          </button>
          <button
            type="button"
            onClick={() => burst({ force: true })}
            className="press rounded-sm bg-focus px-4 py-2 text-sm font-medium text-paper hover:bg-focus-deep"
          >
            Estouro (acerto no quiz)
          </button>
          <button
            type="button"
            onClick={() => celebrate()}
            className="press rounded-sm border border-hairline px-4 py-2 text-sm text-slate-soft hover:text-paper"
          >
            Celebração (respeitando reduced-motion)
          </button>
        </div>
        <p className="mt-2 text-2xs text-slate-muted">
          Os dois primeiros forçam o efeito mesmo com reduced-motion, só para teste.
        </p>
      </div>

      {/* Toast */}
      <div className="rounded-md border border-hairline bg-elevated p-4">
        <p className="mb-3 text-2xs uppercase tracking-wider text-slate-muted">Avisos (toast)</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => notify("Aviso informativo de teste.", "info")}
            className="press rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:text-paper"
          >
            info
          </button>
          <button
            type="button"
            onClick={() => notify("Deu tudo certo!", "success")}
            className="press rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:text-paper"
          >
            success
          </button>
          <button
            type="button"
            onClick={() => notify("Algo deu errado.", "error")}
            className="press rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:text-paper"
          >
            error
          </button>
        </div>
      </div>

      {/* Animações de entrada */}
      <div className="rounded-md border border-hairline bg-elevated p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-2xs uppercase tracking-wider text-slate-muted">Animações de entrada</p>
          <button
            type="button"
            onClick={() => setReplay((n) => n + 1)}
            className="press rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:text-paper"
          >
            Repetir
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {ANIMS.map((a) => (
            <div
              key={`${a.name}-${replay}`}
              className={`${a.cls} rounded-sm border border-hairline bg-surface p-4 text-center text-sm text-paper`}
            >
              {a.label}
            </div>
          ))}
        </div>
      </div>

      {/* Moods do mascote */}
      <div className="rounded-md border border-hairline bg-elevated p-4">
        <p className="mb-3 text-2xs uppercase tracking-wider text-slate-muted">Moods do mascote</p>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {MOODS.map((mood) => (
            <div key={mood} className="flex flex-col items-center gap-2">
              <Mascot mood={mood} size="md" />
              <span className="font-mono text-2xs text-slate-muted">{mood}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
