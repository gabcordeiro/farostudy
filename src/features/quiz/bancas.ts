/**
 * Bancas organizadoras curadas para o quiz -- lista fechada, não texto livre.
 * Mesmo motivo das tags: evita erro de digitação do aluno e evita mandar
 * texto dele direto pro prompt da IA (o generate-quiz valida a chave contra
 * essa mesma lista fechada antes de usar qualquer coisa no prompt).
 * A descrição de estilo detalhada (o que de fato guia o Gemini) mora só no
 * servidor -- aqui é só o que aparece pro usuário escolher.
 */
export type BancaKey = "generico" | "cebraspe" | "fgv" | "fcc" | "vunesp" | "ibfc";

export interface BancaOption {
  key: BancaKey;
  label: string;
  /** Legenda curta mostrada abaixo do seletor. */
  description: string;
}

export const BANCAS: BancaOption[] = [
  { key: "generico", label: "Genérico (padrão)", description: "Múltipla escolha comum, sem estilo de banca específica." },
  { key: "cebraspe", label: "CESPE / Cebraspe", description: "Julgamento Certo ou Errado, uma afirmação por vez." },
  { key: "fgv", label: "FGV", description: "Múltipla escolha, enunciados mais longos e interpretativos." },
  { key: "fcc", label: "FCC", description: "Múltipla escolha, alternativas diretas e literais." },
  { key: "vunesp", label: "VUNESP", description: "Múltipla escolha, enunciados objetivos." },
  { key: "ibfc", label: "IBFC", description: "Múltipla escolha, nível introdutório." },
];

export const BANCAS_BY_KEY: Record<BancaKey, BancaOption> = Object.fromEntries(
  BANCAS.map((b) => [b.key, b]),
) as Record<BancaKey, BancaOption>;
