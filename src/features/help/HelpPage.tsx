/**
 * Ajuda: o que é o app, como começar, o que faz cada aba e dúvidas comuns.
 * Também permite reabrir o tour de boas-vindas.
 */
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Mascot } from "@/components/Mascot";
import { IconHelp } from "@/components/icons";
import { useAppOutletContext } from "@/lib/appOutletContext";
import { SECTIONS } from "./content";

const FIRST_STEPS = [
  {
    title: "Crie sua primeira trilha",
    body: "Uma trilha e uma matéria ou tópico do edital. Você pode criar direto na tela de Gerar, no seletor de trilha.",
    to: "/trilhas",
    cta: "Ver trilhas",
  },
  {
    title: "Gere cards com IA",
    body: "Cole um texto ou resumo em Gerar. Comece com um trecho pequeno, de um assunto só: os cards saem mais precisos assim.",
    to: "/importar",
    cta: "Gerar cards",
  },
  {
    title: "Estude alguns minutos",
    body: "Va em Estudar e responda os cards do dia. Seja honesto na avaliação: e ela que ensina o app quando te mostrar cada card de novo.",
    to: "/estudar",
    cta: "Estudar agora",
  },
  {
    title: "Volte amanha",
    body: "A repetição espaçada só funciona com constancia. Alguns minutos por dia rendem muito mais que horas de uma vez.",
    to: "/painel",
    cta: "Ver evolução",
  },
];

const FAQ = [
  {
    q: "O que é repetição espaçada?",
    a: "É um método em que cada card volta a aparecer em intervalos crescentes, ajustados pelo seu desempenho. O que você erra reaparece logo; o que já sabe demora mais. Assim seu tempo vai para o que ainda não está fixado.",
  },
  {
    q: "Por que devo avaliar honestamente se acertei?",
    a: "A avaliação (de Errei a Fácil) e o que define quando o card volta. Se marcar Fácil em algo que você chutou, o card só vai reaparecer daqui a muito tempo, e você vai esquecer. Marcar Errei não e derrota, e o que faz o método funcionar.",
  },
  {
    q: "Quantos cards devo estudar por dia?",
    a: "Não existe número certo. O app já mostra apenas o que venceu no dia, então o ideal e zerar essa fila. Se estiver acumulando muita coisa, gere menos cards novos por semana até estabilizar.",
  },
  {
    q: "O que consome crédito?",
    a: "Apenas as gerações por IA: criar cards em Gerar e montar um quiz novo. Estudar, editar cards e refazer um quiz já salvo não custam nada. Se a geração falhar, o crédito e devolvido automaticamente.",
  },
  {
    q: "Posso editar um card que a IA gerou errado?",
    a: "Pode e deve. Abra a trilha em Trilhas, clique no lapis do card e ajuste a frente, o verso ou a dica. Um card mal formulado atrapalha mais que ajuda.",
  },
  {
    q: "Da para usar para idiomas?",
    a: "Sim. Além dos flashcards, a tela de Estudar tem um botão de áudio que le a pergunta e a resposta em voz alta, útil para pronuncia e vocabulario.",
  },
];

export default function HelpPage() {
  const { openTour } = useAppOutletContext();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SEO
        title="Ajuda"
        description="Como usar o Faro Study: guia de inicio, o que faz cada aba e dúvidas comuns."
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

      {/* O que é o app */}
      <section className="mb-10 flex flex-wrap items-center gap-6 rounded-md border border-hairline bg-elevated p-6">
        <Mascot size="md" mood="search" alt="" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg text-paper">O que é o Faro Study</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-muted">
            E um app de <strong className="text-slate-soft">repetição espaçada</strong> para
            concursos e idiomas. Você traz sua matéria, a IA transforma em flashcards, e o app
            calcula o melhor dia para você revisar cada um -- pouco antes de esquecer. O
            resultado: menos tempo relendo o que já sabe, mais tempo no que ainda escapa.
          </p>
          <button
            type="button"
            onClick={openTour}
            className="mt-4 rounded-sm border border-hairline px-4 py-2 text-sm text-paper hover:border-focus"
          >
            Rever o tour de boas-vindas
          </button>
        </div>
      </section>

      {/* Primeiros passos */}
      <section className="mb-10">
        <h2 className="font-display text-lg text-paper">Por onde começar</h2>
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

      {/* O que é cada aba */}
      <section className="mb-10">
        <h2 className="font-display text-lg text-paper">O que é cada aba</h2>
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

      {/* Dúvidas comuns */}
      <section>
        <h2 className="font-display text-lg text-paper">Dúvidas comuns</h2>
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
    </div>
  );
}
