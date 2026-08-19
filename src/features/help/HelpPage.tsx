/**
 * Ajuda: o que e o app, como comecar, o que faz cada aba e duvidas comuns.
 * Tambem permite reabrir o tour de boas-vindas.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Mascot } from "@/components/Mascot";
import { IconHelp } from "@/components/icons";
import { SECTIONS } from "./content";
import { WelcomeTour } from "./WelcomeTour";

const FIRST_STEPS = [
  {
    title: "Crie sua primeira trilha",
    body: "Uma trilha e uma materia ou topico do edital. Voce pode criar direto na tela de Importar, no seletor de trilha.",
    to: "/trilhas",
    cta: "Ver trilhas",
  },
  {
    title: "Gere cards com IA",
    body: "Cole um texto ou resumo em Importar. Comece com um trecho pequeno, de um assunto so: os cards saem mais precisos assim.",
    to: "/importar",
    cta: "Gerar cards",
  },
  {
    title: "Estude alguns minutos",
    body: "Va em Estudar e responda os cards do dia. Seja honesto na avaliacao: e ela que ensina o app quando te mostrar cada card de novo.",
    to: "/estudar",
    cta: "Estudar agora",
  },
  {
    title: "Volte amanha",
    body: "A repeticao espacada so funciona com constancia. Alguns minutos por dia rendem muito mais que horas de uma vez.",
    to: "/painel",
    cta: "Ver evolucao",
  },
];

const FAQ = [
  {
    q: "O que e repeticao espacada?",
    a: "E um metodo em que cada card volta a aparecer em intervalos crescentes, ajustados pelo seu desempenho. O que voce erra reaparece logo; o que ja sabe demora mais. Assim seu tempo vai para o que ainda nao esta fixado.",
  },
  {
    q: "Por que devo avaliar honestamente se acertei?",
    a: "A avaliacao (de Errei a Facil) e o que define quando o card volta. Se marcar Facil em algo que voce chutou, o card so vai reaparecer daqui a muito tempo, e voce vai esquecer. Marcar Errei nao e derrota, e o que faz o metodo funcionar.",
  },
  {
    q: "Quantos cards devo estudar por dia?",
    a: "Nao existe numero certo. O app ja mostra apenas o que venceu no dia, entao o ideal e zerar essa fila. Se estiver acumulando muita coisa, gere menos cards novos por semana ate estabilizar.",
  },
  {
    q: "O que consome credito?",
    a: "Apenas as geracoes por IA: criar cards em Importar e montar um quiz novo. Estudar, editar cards e refazer um quiz ja salvo nao custam nada. Se a geracao falhar, o credito e devolvido automaticamente.",
  },
  {
    q: "Posso editar um card que a IA gerou errado?",
    a: "Pode e deve. Abra a trilha em Trilhas, clique no lapis do card e ajuste a frente, o verso ou a dica. Um card mal formulado atrapalha mais que ajuda.",
  },
  {
    q: "Da para usar para idiomas?",
    a: "Sim. Alem dos flashcards, a tela de Estudar tem um botao de audio que le a pergunta e a resposta em voz alta, util para pronuncia e vocabulario.",
  },
];

export default function HelpPage() {
  const [tourOpen, setTourOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SEO
        title="Ajuda"
        description="Como usar o Faro Study: guia de inicio, o que faz cada aba e duvidas comuns."
        path="/ajuda"
        noindex
      />

      <header className="mb-8 flex items-center gap-3">
        <IconHelp className="h-6 w-6 text-focus-soft" title="Ajuda" />
        <div>
          <h1 className="font-display text-2xl text-paper">Ajuda</h1>
          <p className="text-sm text-slate-muted">Como o Faro Study funciona, do zero.</p>
        </div>
      </header>

      {/* O que e o app */}
      <section className="mb-10 flex flex-wrap items-center gap-6 rounded-md border border-hairline bg-elevated p-6">
        <Mascot size="md" mood="search" alt="" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg text-paper">O que e o Faro Study</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-muted">
            E um app de <strong className="text-slate-soft">repeticao espacada</strong> para
            concursos e idiomas. Voce traz sua materia, a IA transforma em flashcards, e o app
            calcula o melhor dia para voce revisar cada um -- pouco antes de esquecer. O
            resultado: menos tempo relendo o que ja sabe, mais tempo no que ainda escapa.
          </p>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            className="mt-4 rounded-sm border border-hairline px-4 py-2 text-sm text-paper hover:border-focus"
          >
            Rever o tour de boas-vindas
          </button>
        </div>
      </section>

      {/* Primeiros passos */}
      <section className="mb-10">
        <h2 className="font-display text-lg text-paper">Por onde comecar</h2>
        <ol className="mt-4 space-y-3">
          {FIRST_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-wrap items-start gap-4 rounded-md border border-hairline bg-elevated p-4"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-focus text-sm font-medium text-paper"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-paper">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-muted">{step.body}</p>
              </div>
              <Link
                to={step.to}
                className="shrink-0 rounded-sm border border-hairline px-3 py-1.5 text-2xs text-slate-soft hover:border-focus hover:text-paper"
              >
                {step.cta}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* O que e cada aba */}
      <section className="mb-10">
        <h2 className="font-display text-lg text-paper">O que e cada aba</h2>
        <div className="mt-4 space-y-2">
          {SECTIONS.map(({ to, label, Icon, detail }) => (
            <div key={to} className="rounded-md border border-hairline bg-elevated p-4">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-focus-soft" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-paper">{label}</h3>
                    <Link
                      to={to}
                      className="text-2xs text-action underline underline-offset-2"
                    >
                      Abrir
                    </Link>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-muted">{detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Duvidas comuns */}
      <section>
        <h2 className="font-display text-lg text-paper">Duvidas comuns</h2>
        <div className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-elevated">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-paper">
                {item.q}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-lg text-slate-muted transition-transform duration-150 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <WelcomeTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
