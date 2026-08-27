-- =============================================================================
-- Lembra qual banca (CESPE/Cebraspe, FGV, FCC, VUNESP, IBFC ou generico) foi
-- usada para gerar cada bateria salva, so para exibir na lista -- nao ha
-- validacao de valores aqui porque a lista fechada ja e garantida no cliente
-- (bancas.ts) e no servidor (generate-quiz, que ignora qualquer chave
-- desconhecida e cai em "generico" antes de usar no prompt da IA).
-- =============================================================================
alter table public.quiz_sets add column banca text;
