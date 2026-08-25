/** Termos de Serviço (checklist produção #16, regra #26). */
import { SEO } from "@/components/SEO";

export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <SEO
        title="Termos de Serviço"
        description="Regras de uso do Faro Study."
        path="/termos"
      />
      <h1 className="font-display text-3xl text-paper">Termos de Serviço</h1>
      <p className="mt-2 text-2xs uppercase tracking-wider text-slate-muted">
        Última atualização: 19 de agosto de 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-soft">
        <section>
          <h2 className="font-display text-lg text-paper">Uso do serviço</h2>
          <p>
            O Faro Study oferece ferramentas de repetição espaçada para estudo. Você e
            responsável pelo conteúdo que cria ou importa e por respeitar direitos autorais de
            materiais de terceiros.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Conta</h2>
          <p>
            Você deve manter suas credenciais em segurança. Atividades realizadas na sua conta
            são de sua responsabilidade.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Conteúdo gerado por IA</h2>
          <p>
            Cards gerados por IA podem conter erros. Revise o material antes de estudar; não
            garantimos exatidao do conteúdo gerado automaticamente.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Limitacao de responsabilidade</h2>
          <p>
            O serviço e fornecido no estado em que se encontra. Não nos responsabilizamos por
            perdas decorrentes de indisponibilidade ou de decisoes tomadas com base no conteúdo.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Contato</h2>
          <p>Faro Study - farostudy.contato@gmail.com</p>
        </section>
      </div>
    </main>
  );
}
