/**
 * Contém um crash de render em vez de deixar a árvore inteira do React
 * desmontar pra tela branca. Precisa ser classe -- não existe equivalente
 * de error boundary com hooks.
 *
 * Dois níveis de uso (ver main.tsx / App.tsx):
 * - Um no topo de tudo, único, pega qualquer coisa que escapar dos outros.
 * - Um por rota (com key={pathname}), pra um crash numa página não derrubar
 *   a sidebar/navegação junto -- trocar de aba já remonta e limpa sozinho,
 *   sem precisar recarregar a página inteira.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Mascot } from "./Mascot";

interface Props {
  children: ReactNode;
  /** Mensagem/ação diferente pro boundary por-rota (mais leve que o de topo). */
  variant?: "full" | "route";
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sem telemetria de cliente por enquanto -- pelo menos fica no console
    // pra achar no devtools/log do Vercel em vez de sumir sem rastro.
    console.error("ErrorBoundary capturou um crash:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const isRoute = this.props.variant === "route";

    return (
      <div
        className={
          isRoute
            ? "mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-14 text-center"
            : "flex min-h-screen flex-col items-center justify-center gap-4 bg-page px-4 text-center"
        }
      >
        <Mascot size="lg" mood="sleepy" alt="" />
        <div className="max-w-md space-y-1.5">
          <h1 className="font-display text-xl text-paper">Algo não saiu como esperado</h1>
          <p className="text-sm text-slate-muted">
            {isRoute
              ? "Essa página travou. Tente abrir outra aba do menu, ou recarregue se persistir."
              : "O Faro tropeçou em alguma coisa. Recarregar a página costuma resolver."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="press rounded-sm bg-action px-5 py-2.5 text-sm font-medium text-action-ink hover:bg-action-deep"
        >
          Recarregar página
        </button>
      </div>
    );
  }
}
