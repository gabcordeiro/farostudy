/**
 * Escape de conteúdo do usuário para renderização segura dos flashcards.
 * Regra: NUNCA usar dangerouslySetInnerHTML com texto de card sem passar por aqui.
 * (checklist segurança #15 - escape user content / anti XSS)
 *
 * Estratégia padrão: renderizar como texto puro (o React já escapa por default).
 * Este helper existe para os poucos pontos que precisam montar HTML (ex: markdown
 * mínimo de card). Aqui permitimos um subconjunto seguro e escapamos o resto.
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

/**
 * Converte um card em HTML seguro suportando apenas **negrito**, _italico_ e
 * quebras de linha. Todo o restante e escapado antes de aplicar o realce.
 */
export function renderCardHtml(raw: string): string {
  const safe = escapeHtml(raw);
  return safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}
