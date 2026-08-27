// =============================================================================
// Edge Function: generate-quiz
// A partir dos cards de uma trilha, pede ao Gemini alternativas de multipla
// escolha (ou, para Cebraspe, uma afirmacao Certo/Errado) por card.
// NAO grava nada; a UI grava reviews depois.
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { logError } from "../_shared/errorLog.ts";

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GENERATION_COST = 1;

interface Choice {
  text: string;
  isCorrect: boolean;
}
interface QuizItem {
  cardId: string;
  front: string;
  choices: Choice[];
}
interface CardRow {
  id: string;
  front: string;
  back: string;
}

// Lista fechada -- espelha src/features/quiz/bancas.ts (BancaKey). Nunca usar
// texto vindo do cliente aqui: so essas chaves conhecidas entram no prompt.
type BancaKey = "generico" | "cebraspe" | "fgv" | "fcc" | "vunesp" | "ibfc";
const VALID_BANCAS = new Set<BancaKey>(["generico", "cebraspe", "fgv", "fcc", "vunesp", "ibfc"]);
function parseBanca(v: unknown): BancaKey {
  return typeof v === "string" && VALID_BANCAS.has(v as BancaKey) ? (v as BancaKey) : "generico";
}

// So para as bancas de multipla escolha (Cebraspe tem prompt/formato proprios,
// ver callGeminiCebraspe abaixo). Instrucao de estilo, nao muda o formato JSON.
const BANCA_STYLE: Partial<Record<BancaKey, string>> = {
  fgv: "Estilo FGV: enunciados mais longos e interpretativos, com alternativas parecidas entre si que exigem leitura atenta.",
  fcc: "Estilo FCC: alternativas diretas e objetivas, proximas da letra da lei ou do texto original.",
  vunesp: "Estilo VUNESP: alternativas objetivas e diretas, sem armadilhas rebuscadas.",
  ibfc: "Estilo IBFC: alternativas em nivel introdutorio, direto ao ponto.",
};

function clampChoice(c: unknown): Choice | null {
  if (typeof c !== "object" || c === null) return null;
  const obj = c as Record<string, unknown>;
  const text = (obj.text ?? "").toString().trim().slice(0, 400);
  const isCorrect = obj.isCorrect === true;
  return text ? { text, isCorrect } : null;
}

/** Multipla escolha (generico + as bancas que so mudam o estilo do enunciado). */
async function callGemini(
  apiKey: string,
  cards: CardRow[],
  banca: BancaKey,
): Promise<Record<string, { front: string; choices: Choice[] }>> {
  const list = cards
    .map((c) => `${c.id} | Frente: ${c.front.slice(0, 400)} | Resposta: ${c.back.slice(0, 400)}`)
    .join("\n");
  const styleLine = BANCA_STYLE[banca];
  const instruction = `Para cada card abaixo, gere 4 alternativas de múltipla escolha:
- Exatamente 1 alternativa DEVE ser correta (isCorrect: true).
- As demais devem ser plausíveis mas incorretas.
- Não repita a resposta literalmente entre as incorretas.
${styleLine ? `- ${styleLine}\n` : ""}- IDIOMA: escreva em português do Brasil com ortografia e acentuação corretas.
  Use acentos e cedilha sempre que a palavra exigir (é, á, ã, ó, ê, ç, ú, í).
  Nunca escreva "e" no lugar de "é", nem omita acentos para simplificar.
- Retorne JSON exato: {"items":[{"cardId":"...","choices":[{"text":"...","isCorrect":true|false}]}]}.

Cards:
${list}`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: instruction }] }],
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  cardId: { type: "STRING" },
                  choices: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        text: { type: "STRING" },
                        isCorrect: { type: "BOOLEAN" },
                      },
                      required: ["text", "isCorrect"],
                    },
                  },
                },
                required: ["cardId", "choices"],
              },
            },
          },
          required: ["items"],
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini respondeu ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"items":[]}';
  const parsed = JSON.parse(text) as {
    items?: { cardId?: string; choices?: unknown[] }[];
  };

  const byId: Record<string, { front: string; choices: Choice[] }> = {};
  for (const item of parsed.items ?? []) {
    if (!item.cardId || !Array.isArray(item.choices)) continue;
    const choices = item.choices.map(clampChoice).filter((c): c is Choice => c !== null);
    const correctCount = choices.filter((c) => c.isCorrect).length;
    // Precisa ter exatamente 1 correta e pelo menos 3 opcoes no total.
    if (correctCount !== 1 || choices.length < 3) continue;
    const card = cards.find((c) => c.id === item.cardId);
    byId[item.cardId] = { front: card?.front ?? "", choices: choices.slice(0, 4) };
  }
  return byId;
}

/**
 * Cebraspe: formato Certo/Errado, nao multipla escolha. A IA so decide o
 * texto da afirmacao e se ela e verdadeira -- as duas alternativas
 * ("Certo"/"Errado") sao montadas aqui no codigo, nunca confiando que o
 * modelo devolva exatamente esse par certo.
 */
async function callGeminiCebraspe(
  apiKey: string,
  cards: CardRow[],
): Promise<Record<string, { front: string; choices: Choice[] }>> {
  const list = cards
    .map((c) => `${c.id} | Frente: ${c.front.slice(0, 400)} | Resposta: ${c.back.slice(0, 400)}`)
    .join("\n");
  const instruction = `Para cada card abaixo, escreva UMA afirmação no estilo Cebraspe (CESPE): uma frase
declarativa (NUNCA uma pergunta) sobre o conteúdo do card, que o candidato deve julgar como
certa ou errada.
- Varie: em alguns cards a afirmação deve ser verdadeira (correct: true); em outros, insira um
  erro sutil e plausível que a torne falsa (correct: false).
- Nunca escreva as palavras "certo" ou "errado" dentro da própria afirmação.
- IDIOMA: português do Brasil, com ortografia e acentuação corretas (é, á, ã, ó, ê, ç, ú, í).
  Nunca omita acentos.
- Retorne JSON exato: {"items":[{"cardId":"...","statement":"...","correct":true|false}]}.

Cards:
${list}`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: instruction }] }],
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  cardId: { type: "STRING" },
                  statement: { type: "STRING" },
                  correct: { type: "BOOLEAN" },
                },
                required: ["cardId", "statement", "correct"],
              },
            },
          },
          required: ["items"],
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini respondeu ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"items":[]}';
  const parsed = JSON.parse(text) as {
    items?: { cardId?: string; statement?: string; correct?: boolean }[];
  };

  const byId: Record<string, { front: string; choices: Choice[] }> = {};
  for (const item of parsed.items ?? []) {
    if (!item.cardId || typeof item.statement !== "string") continue;
    const statement = item.statement.trim().slice(0, 500);
    if (!statement) continue;
    const correct = item.correct === true;
    byId[item.cardId] = {
      front: statement,
      choices: [
        { text: "Certo", isCorrect: correct },
        { text: "Errado", isCorrect: !correct },
      ],
    };
  }
  return byId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "GEMINI_API_KEY nao configurada" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nao autenticado" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Sessao invalida" }, 401);
  const userId = userData.user.id;

  let body: { deckId?: string; count?: number; banca?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalido" }, 400);
  }

  const deckId = body.deckId?.toString() ?? "";
  const count = Math.min(20, Math.max(1, Number(body.count) || 10));
  const banca = parseBanca(body.banca);
  if (!/^[0-9a-f-]{36}$/i.test(deckId)) return json({ error: "deckId invalido" }, 400);

  const { data: cards, error: cardsErr } = await supabase
    .from("cards")
    .select("id, front, back")
    .eq("deck_id", deckId)
    .neq("state", "suspended")
    .limit(count);
  if (cardsErr) return json({ error: "Falha ao ler cards", detail: cardsErr.message }, 400);
  if (!cards || cards.length === 0) return json({ items: [] });

  const { error: creditErr } = await supabase.rpc("consume_credits", {
    amount: GENERATION_COST,
    reason: "generate-quiz",
  });
  if (creditErr) return json({ error: "Creditos insuficientes", detail: creditErr.message }, 402);

  let resultById: Record<string, { front: string; choices: Choice[] }>;
  try {
    resultById =
      banca === "cebraspe"
        ? await callGeminiCebraspe(apiKey, cards as CardRow[])
        : await callGemini(apiKey, cards as CardRow[], banca);
  } catch (err) {
    await supabase.rpc("refund_credits", { amount: GENERATION_COST, reason: "estorno: falha no Gemini" });
    const code = await logError(supabase, userId, "generate-quiz", 502, (err as Error).message);
    return json(
      { error: "O Faro não conseguiu montar o quiz agora. Tente novamente em instantes.", code },
      502,
    );
  }

  const items: QuizItem[] = (cards as CardRow[])
    .map((c) => {
      const r = resultById[c.id];
      return r ? { cardId: c.id, front: r.front, choices: r.choices } : null;
    })
    .filter((it): it is QuizItem => it !== null && it.choices.length >= 2);

  return json({ items });
});
