/**
 * Le e atualiza o profile do usuario logado. RLS trava tudo em auth.uid()=id.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withJwtRetry } from "@/lib/supabaseQuery";
import { useAuth } from "@/features/auth/AuthProvider";
import type { UserRole } from "@/lib/database.types";

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  role: UserRole;
}

interface UpdateInput {
  display_name?: string;
  avatar_url?: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const res = await withJwtRetry(() =>
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url, locale, timezone, role")
        .eq("id", user.id)
        .maybeSingle(),
    );
    if (res.error) setError(res.error.message ?? "Erro ao carregar");
    else setProfile((res.data ?? null) as ProfileRow | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = useCallback(
    async (patch: UpdateInput): Promise<boolean> => {
      if (!user) return false;
      setError(null);
      const res = await withJwtRetry(() =>
        supabase
          .from("profiles")
          .update(patch)
          .eq("id", user.id)
          .select("id, display_name, avatar_url, locale, timezone, role")
          .single(),
      );
      if (res.error) {
        setError(res.error.message ?? "Falha ao salvar");
        return false;
      }
      setProfile((res.data ?? null) as ProfileRow);
      return true;
    },
    [user],
  );

  return { profile, loading, error, reload: load, update };
}
