/** Política de Privacidade (checklist produção #15, regra #27). */
import { SEO } from "@/components/SEO";

export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <SEO
        title="Política de Privacidade"
        description="Como o Faro Study coleta, usa e protege seus dados."
        path="/privacidade"
      />
      <h1 className="font-display text-3xl text-paper">Política de Privacidade</h1>
      <p className="mt-2 text-2xs uppercase tracking-wider text-slate-muted">
        Última atualização: 22 de agosto de 2026
      </p>

      <div className="prose-faro mt-8 space-y-6 text-sm leading-relaxed text-slate-soft">
        <section>
          <h2 className="font-display text-lg text-paper">Dados que coletamos</h2>
          <p>
            Coletamos e-mail e nome de exibição para autenticação, além do conteúdo de estudo
            que você cria (cards, trilhas e histórico de revisões). Não vendemos dados pessoais.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Como usamos</h2>
          <p>
            Seus dados alimentam apenas suas próprias funcionalidades: geração de cards, agenda
            de revisões e paineis de evolução. O acesso e isolado por conta via Row-Level
            Security no banco de dados.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Terceiros</h2>
          <p>
            Usamos Supabase (autenticação e banco) e a API do Google Gemini para gerar cards a
            partir dos textos que você envia. O texto enviado para geração e transmitido a esses
            provedores apenas para processar o seu pedido.
          </p>
          <p className="mt-3">
            Com o seu consentimento (banner de cookies), usamos o Meta Pixel para entender quais
            páginas e campanhas trazem visitantes e medir a eficácia dos nossos anúncios. Ele só
            carrega se você aceitar cookies de análise, e você pode recusar a qualquer momento
            limpando os dados do site no seu navegador.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Seus direitos (LGPD)</h2>
          <p>
            Você pode acessar, corrigir ou excluir seus dados a qualquer momento. Para exclusão
            total da conta, escreva para o contato abaixo.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-paper">Contato</h2>
          <p>
            Faro Study - Rua Exemplo, 123, Sala 4, Belo Horizonte/MG, CEP 30110-000, Brasil.
            <br />
            privacidade@farostudy.vercel.app
          </p>
        </section>
      </div>
    </main>
  );
}
