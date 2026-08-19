/**
 * Confirmação em dois cliques que expira sozinha.
 *
 * Antes, o "armado" ficava indefinidamente: quem clicasse na lixeira e
 * voltasse minutos depois apagava no clique seguinte, sem novo aviso --
 * e excluir uma trilha leva junto todos os cards dela (cascade no banco).
 * Aqui o estado se desarma sozinho apos ARM_MS.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const ARM_MS = 4000;

export function useArmedAction() {
  const [armedId, setArmedId] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const disarm = useCallback(() => {
    window.clearTimeout(timer.current);
    setArmedId(null);
  }, []);

  const arm = useCallback((id: string) => {
    window.clearTimeout(timer.current);
    setArmedId(id);
    timer.current = window.setTimeout(() => setArmedId(null), ARM_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /**
   * Primeiro clique arma; o segundo (dentro da janela) executa.
   * Retorna true quando a ação foi confirmada.
   */
  const confirm = useCallback(
    (id: string): boolean => {
      if (armedId !== id) {
        arm(id);
        return false;
      }
      disarm();
      return true;
    },
    [armedId, arm, disarm],
  );

  return { armedId, confirm, disarm };
}
