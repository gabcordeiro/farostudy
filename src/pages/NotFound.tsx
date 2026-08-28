/** Custom 404 (checklist produção #1) com o mascote farejando. */
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Mascot } from "@/components/Mascot";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <SEO
        title="Página não encontrada"
        description="A página que você procura não existe."
        path="/404"
        noindex
      />
      <Mascot size="xl" mood="sleepy" alt="Faro triste, a página que você procura não existe" />
      <div className="space-y-2">
        <p className="font-mono text-sm text-action">404</p>
        <h1 className="font-display text-3xl text-paper">O Faro não achou essa trilha</h1>
        <p className="max-w-md text-sm text-slate-muted">
          A página pode ter sido movida ou nunca existiu. Vamos voltar ao seu painel.
        </p>
      </div>
      <Link
        to="/painel"
        className="rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-action-ink hover:bg-action-deep"
      >
        Voltar ao painel
      </Link>
    </main>
  );
}
