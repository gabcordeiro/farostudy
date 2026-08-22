-- Log de erros das edge functions de IA (generate-cards, generate-quiz).
-- O cliente só ve uma mensagem generica + o `id` (curto, como "código"); o
-- detalhe tecnico (ex.: erro cru do Gemini) fica gravado aqui para o admin
-- ver em /admin, sem precisar vasculhar os logs do Supabase.
create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  status_code int not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.error_logs enable row level security;

-- A edge function grava usando o client autenticado do próprio usuário (não
-- service-role), então precisa de uma policy de insert -- mesmo padrão já
-- usado em "reviews: dono insere".
create policy "error_logs: dono insere"
  on public.error_logs for insert
  with check (auth.uid() = user_id);

-- Só admin le -- é informação de diagnóstico, não do usuário comum.
create policy "error_logs: admin le"
  on public.error_logs for select
  using (public.is_admin(auth.uid()));

create index error_logs_created_at_idx on public.error_logs (created_at desc);
