/**
 * Tour de boas-vindas (estilo app): passo a passo em um modal, mostrado uma
 * única vez por usuário. A conclusão fica gravada em profiles.onboarded_at,
 * então acompanha a conta -- não o navegador.
 * Pode ser reaberto a qualquer momento pela página de Ajuda.
 */
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Mascot } from "@/components/Mascot";
import { celebrate } from "@/lib/confetti";
import { TOUR_STEPS } from "./content";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Chamado quando o usuário termina ou pula (grava onboarded_at). */
  onFinish?: () => void;
}

export function WelcomeTour({ open, onClose, onFinish }: Props) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Cada passo mostra a aba de verdade por trás do modal, em vez de só
  // descrever ela em texto.
  useEffect(() => {
    if (open && current) navigate(current.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so no passo/abertura, nao a cada render do navigate
  }, [open, step]);

  const finish = useCallback(() => {
    onFinish?.();
    onClose();
  }, [onFinish, onClose]);

  // Fecha com Esc, como qualquer modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open || !current) return null;

  // Passo 0 (boas-vindas, sem página específica pra mostrar) fica centralizado
  // e mais opaco, como um modal comum. Do passo 1 em diante, cada um mostra
  // uma aba de verdade por trás -- então o card vai pra direita e o fundo
  // fica quase transparente, só o suficiente pra não brigar com o conteúdo.
  const isIntro = step === 0;

  // Portal pro body: sem isso, o modal renderiza dentro da árvore da página
  // (que fica embrulhada pela transição de rota, animate-rise-in). Um
  // transform aplicado por essa animação cria um novo containing block para
  // "position: fixed" -- o modal deixa de cobrir a tela e vira um retângulo
  // cinza preso dentro do conteúdo da página, sem o card visível.
  return createPortal(
    <>
      {/* So o fundo -- a posicao do card agora vive nele mesmo (abaixo),
          nao em alinhamento flex daqui, porque align-items/justify-content
          nao sao propriedades que o CSS sabe interpolar: a troca seria um
          salto, nunca uma transicao. */}
      <div
        className={`fixed inset-0 z-50 transition-colors duration-300 ${
          isIntro ? "bg-page/80" : "bg-page/10"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        // top/left/transform/width -- nunca com valor "auto" nos dois
        // estados, senao a transicao correspondente nao anima (auto nao
        // interpola). No passo 0 fica centralizado em qualquer tela; do
        // passo 1 em diante vira bottom sheet no celular (mesmo padrao do
        // menu "Mais" do MobileNav) e desliza pro canto inferior direito
        // a partir do sm:.
        //
        // animate-fade-in (nao animate-rise-in) de proposito: rise-in anima
        // transform (translateY), e com fill-mode "both" essa trava fica
        // ativa pra sempre depois de tocar -- bloqueando qualquer transform
        // vindo das classes de posicao abaixo (confirmado inspecionando o
        // computed style: a matriz ficava sempre identidade, mesmo com as
        // variaveis --tw-translate-x/y certas). fade-in so mexe em opacity.
        className={`animate-fade-in fixed z-50 rounded-md border border-hairline bg-elevated p-6 shadow-pop transition-all duration-500 ease-fluid ${
          isIntro
            ? "left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
            : "left-1/2 top-[100%] w-screen max-w-none -translate-x-1/2 -translate-y-full sm:left-[calc(100%-3rem)] sm:top-[calc(100%-3rem)] sm:w-[calc(100vw-2rem)] sm:max-w-sm sm:-translate-x-full sm:-translate-y-full"
        }`}
      >
        <div className="flex justify-center">
          <Mascot size="lg" mood={current.mood} alt="" />
        </div>

        <h2 id="tour-title" className="mt-5 text-center font-display text-xl text-paper">
          {current.title}
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-muted">
          {current.body}
        </p>

        {/* Indicador de passo */}
        <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-sm transition-all duration-200 ${
                i === step ? "w-6 bg-action" : "w-1.5 bg-hairline"
              }`}
            />
          ))}
        </div>
        <p className="sr-only">
          Passo {step + 1} de {TOUR_STEPS.length}
        </p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-2xs text-slate-muted hover:text-paper"
          >
            Pular tour
          </button>

          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="press rounded-sm border border-hairline px-4 py-2 text-sm text-slate-soft hover:text-paper"
              >
                Voltar
              </button>
            ) : null}
            {isLast ? (
              <button
                type="button"
                onClick={() => {
                  // Confete só aqui -- terminar de verdade, não pular
                  // (finish() também é chamado por "Pular tour" e Esc).
                  celebrate();
                  finish();
                  navigate("/importar");
                }}
                className="press rounded-sm bg-action px-5 py-2 text-sm font-medium text-action-ink hover:bg-action-deep"
              >
                Criar meus cards
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="press rounded-sm bg-action px-5 py-2 text-sm font-medium text-action-ink hover:bg-action-deep"
              >
                Próximo
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
