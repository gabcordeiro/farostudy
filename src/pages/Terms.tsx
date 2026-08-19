/** Termos de Servico (checklist producao #16, regra #26). */
import { SEO } from "@/components/SEO";

export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <SEO
        title="Termos de Servico"
        description="Regras de uso do Faro Study."
        path="/termos"
      />
      <h1 className="font-display text-3xl text-paper">Termos de Servico</h1>
      <p className="mt-2 text-2xs uppercase tracking-wider text-slate-muted">
        Ultima atualizacao: 19 de agosto de 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-soft">
        <section>
          <h2 className="font-display text-lg text-paper">Uso do servico</h2>
          <p>
            O Faro Study oferece ferramentas de repeticao espacada para estudo. Voce e
            responsavel pelo conteudo que cria ou importa e por respeitar direitos autorais de
            materiais de terceiros.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Conta</h2>
          <p>
            Voce deve manter suas credenciais em seguranca. Atividades realizadas na sua conta
            sao de sua responsabilidade.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Conteudo gerado por IA</h2>
          <p>
            Cards gerados por IA podem conter erros. Revise o material antes de estudar; nao
            garantimos exatidao do conteudo gerado automaticamente.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Limitacao de responsabilidade</h2>
          <p>
            O servico e fornecido no estado em que se encontra. Nao nos responsabilizamos por
            perdas decorrentes de indisponibilidade ou de decisoes tomadas com base no conteudo.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Contato</h2>
          <p>Faro Study - contato@farostudy.vercel.app</p>
        </section>
      </div>
    </main>
  );
}
