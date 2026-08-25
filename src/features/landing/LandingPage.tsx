/**
 * Landing pública: hero com CTA acima da dobra, destaques do produto,
 * chamada de preços e FAQ (accordion nativo <details>/<summary>).
 */
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Mascot } from "@/components/Mascot";
import { IconChart, IconQuiz, IconRoute, IconWand } from "@/components/icons";

const HIGHLIGHTS = [
  {
    Icon: IconWand,
    title: "IA gera os cards",
    body: "Cole um texto, um JSON ou o edital e o Faro monta os flashcards prontos para revisar.",
  },
  {
    Icon: IconRoute,
    title: "Trilhas por assunto",
    body: "Organize por matéria ou tópico do edital e acompanhe cada uma separadamente.",
  },
  {
    Icon: IconChart,
    title: "BI de retenção",
    body: "Heatmap de consistência e curva de esquecimento mostram onde focar.",
  },
  {
    Icon: IconQuiz,
    title: "Quiz de múltipla escolha",
    body: "Vire seus cards em quiz gerado por IA, salve e refaça quando quiser.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "O que é repetição espaçada?",
    a: "É um método de estudo em que você revisa cada card em intervalos crescentes, ajustados conforme você acerta ou erra. Isso concentra seu tempo no que você ainda não sabe bem, em vez de repetir tudo igualmente.",
  },
  {
    q: "Como a IA gera os cards?",
    a: "Você cola um texto, um JSON estruturado ou o conteúdo de um edital em Gerar. O Faro processa esse material e devolve flashcards com pergunta e resposta prontos para a sua trilha.",
  },
  {
    q: "Preciso pagar para usar?",
    a: "Toda conta nova recebe créditos grátis de boas-vindas. Cada geração de cards ou quiz com IA consome 1 crédito; quando acabar, dá para solicitar mais em Planos.",
  },
  {
    q: "Da para importar minhas coleções do Anki?",
    a: "Sim, o suporte a arquivos .apkg esta no roadmap do Gerar, permitindo trazer suas coleções existentes e deixar a IA sugerir novas perguntas a partir delas.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. O acesso e isolado por conta (Row-Level Security no banco), suas senhas nunca são armazenadas em texto puro, e você pode entrar com e-mail/senha ou com sua conta Google.",
  },
  {
    q: "Funciona para idiomas também?",
    a: "Sim. Além de concursos públicos, o Faro tem leitura em voz alta (texto-para-fala) nos cards, útil para pronuncia e fixacao de vocabulario.",
  },
];

function Faq() {
  return (
    <div className="divide-y divide-hairline rounded-md border border-hairline bg-elevated">
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
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <SEO
        title="Faro Study"
        description="Repetição espaçada com IA para concursos públicos e idiomas. Gere flashcards, monte quizzes e acompanhe sua retenção."
        path="/"
      />

      <header className="border-b border-hairline px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mascot size="sm" alt="Faro Study" />
            <span className="font-brand text-lg font-semibold text-paper">Faro Study</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/planos" className="text-slate-soft hover:text-paper">
              Planos
            </Link>
            <Link
              to="/login"
              className="press rounded-sm bg-action px-4 py-2 font-medium text-ink-900 hover:bg-action-deep"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero -- CTA acima da dobra */}
      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="font-display text-4xl leading-tight text-paper sm:text-5xl">
            O faro certo para suas revisões.
          </h1>
          <p className="mt-4 max-w-md text-base text-slate-muted">
            Transforme editais, textos e cards em revisões que acontecem no momento
            certo. IA gera as perguntas, você decide quando revisar.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="press rounded-sm bg-action px-6 py-3 text-sm font-medium text-ink-900 hover:bg-action-deep"
            >
              Criar conta grátis
            </Link>
            <Link
              to="/planos"
              className="press rounded-sm border border-hairline px-6 py-3 text-sm text-paper hover:border-focus"
            >
              Ver planos
            </Link>
          </div>
          <p className="mt-4 text-2xs text-slate-muted">
            Conta grátis inclui créditos de boas-vindas para testar a geração por IA.
          </p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <Mascot size="xl" mood="cheer" alt="Faro, o mascote, pronto para estudar" />
        </div>
      </section>

      {/* Destaques -- grid 2x2, não 3 cards em fileira */}
      <section className="border-t border-hairline bg-surface px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl text-paper">Como o Faro ajuda</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {HIGHLIGHTS.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-md border border-hairline bg-elevated p-5">
                <Icon className="h-6 w-6 text-focus-soft" title={title} />
                <h3 className="mt-3 font-display text-lg text-paper">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl text-paper">Perguntas frequentes</h2>
          <p className="mt-2 text-sm text-slate-muted">
            Não achou o que procurava? Escreva para{" "}
            <a href="mailto:farostudy.contato@gmail.com" className="text-action underline underline-offset-2">
              farostudy.contato@gmail.com
            </a>
            .
          </p>
          <div className="mt-6">
            <Faq />
          </div>
        </div>
      </section>

      <footer className="border-t border-hairline px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-2xs text-slate-muted">
          <span>Faro Study - repetição espaçada para concursos e idiomas</span>
          <div className="flex gap-4">
            <Link to="/termos" className="hover:text-paper">
              Termos
            </Link>
            <Link to="/privacidade" className="hover:text-paper">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
