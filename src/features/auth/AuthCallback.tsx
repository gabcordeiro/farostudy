/**
 * Retorno do OAuth (Google). Com detectSessionInUrl + PKCE, o SDK troca o code
 * por sessão automaticamente; aqui apenas aguardamos e redirecionamos.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Mascot } from "@/components/Mascot";

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const finish = (path: string) => active && navigate(path, { replace: true });

    // Se já houver sessão (code trocado), segue direto.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish("/painel");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish("/painel");
    });

    // Falha silenciosa após alguns segundos volta ao login.
    const timer = window.setTimeout(() => finish("/login"), 8000);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Mascot size="lg" mood="sleepy" alt="Faro concluindo seu login" />
      <p className="text-sm text-slate-muted">Concluindo seu acesso...</p>
    </main>
  );
}
