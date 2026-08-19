/** Politica de Privacidade (checklist producao #15, regra #27). */
import { SEO } from "@/components/SEO";

export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <SEO
        title="Politica de Privacidade"
        description="Como o Faro Cards coleta, usa e protege seus dados."
        path="/privacidade"
      />
      <h1 className="font-display text-3xl text-paper">Politica de Privacidade</h1>
      <p className="mt-2 text-2xs uppercase tracking-wider text-slate-muted">
        Ultima atualizacao: 19 de agosto de 2026
      </p>

      <div className="prose-faro mt-8 space-y-6 text-sm leading-relaxed text-slate-soft">
        <section>
          <h2 className="font-display text-lg text-paper">Dados que coletamos</h2>
          <p>
            Coletamos e-mail e nome de exibicao para autenticacao, alem do conteudo de estudo
            que voce cria (cards, trilhas e historico de revisoes). Nao vendemos dados pessoais.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Como usamos</h2>
          <p>
            Seus dados alimentam apenas suas proprias funcionalidades: geracao de cards, agenda
            de revisoes e paineis de evolucao. O acesso e isolado por conta via Row-Level
            Security no banco de dados.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Terceiros</h2>
          <p>
            Usamos Supabase (autenticacao e banco) e a API do Google Gemini para gerar cards a
            partir dos textos que voce envia. O texto enviado para geracao e transmitido a esses
            provedores apenas para processar o seu pedido.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Seus direitos (LGPD)</h2>
          <p>
            Voce pode acessar, corrigir ou excluir seus dados a qualquer momento. Para exclusao
            total da conta, escreva para o contato abaixo.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Contato</h2>
          <p>
            Faro Cards - Rua Exemplo, 123, Sala 4, Belo Horizonte/MG, CEP 30110-000, Brasil.
            <br />
            privacidade@farocards.app
          </p>
        </section>
      </div>
    </main>
  );
}
