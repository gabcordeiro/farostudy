/** Thank you page (checklist producao #14). */
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Mascot } from "@/components/Mascot";

export default function ThankYou() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <SEO
        title="Obrigado"
        description="Recebemos seu cadastro no Faro Cards."
        path="/obrigado"
        noindex
      />
      <Mascot size="xl" mood="cheer" alt="Faro comemorando seu cadastro" />
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-paper">Tudo certo por aqui</h1>
        <p className="max-w-md text-sm text-slate-muted">
          Confirmamos seu cadastro. O Faro ja esta preparando suas primeiras trilhas de estudo.
        </p>
      </div>
      <Link
        to="/painel"
        className="rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-action-deep"
      >
        Ir para o painel
      </Link>
    </main>
  );
}
