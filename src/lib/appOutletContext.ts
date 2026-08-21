/**
 * Contexto que o layout autenticado (App.tsx) passa pro <Outlet/> das
 * páginas internas. Vive num arquivo à parte pra App.tsx e as páginas
 * (ex: HelpPage) poderem importar sem criar dependência circular --
 * App.tsx carrega as páginas via lazy(), então uma página importando
 * direto de App.tsx fecharia o ciclo.
 */
import { useOutletContext } from "react-router-dom";

export interface AppOutletContext {
  /** A Ajuda usa isso pra reabrir o tour -- ele mora em App.tsx pra sobreviver à troca de rota. */
  openTour: () => void;
}

export function useAppOutletContext() {
  return useOutletContext<AppOutletContext>();
}
