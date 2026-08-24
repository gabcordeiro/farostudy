// =============================================================================
// Edge Function: generate-schedule
// A partir de uma trilha e uma data de prova, monta um cronograma de sessões
// de estudo até lá. As DATAS são calculadas aqui (espaçadas, deterministico --
// a IA não erra data assim); o Gemini só sugere o TÍTULO de cada sessão, com
// base no conteúdo real dos cards da trilha, pra não ser um "Sessão 1/2/3"
// genérico.
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { logError } from "../_shared/errorLog.ts";

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GENERATION_COST = 1;
const MIN_SESSIONS = 2;
const MAX_SESSIONS = 10;

interface CardRow {
  front: string;
  back: string;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Offsets (em dias, a partir de hoje) das sessões: espaçados, nunca no dia da prova. */
function sessionOffsets(daysAvailable: number): number[] {
  const count = Math.min(MAX_SESSIONS, Math.max(MIN_SESSIONS, Math.round(daysAvailable / 3)));
  const n = Math.min(count, daysAvailable); // nunca mais sessões que dias disponíveis
  const offsets: number[] = [];
  for (let i = 1; i <= n; i++) {
    offsets.push(Math.round((i * daysAvailable) / (n + 1)));
  }
  // Garante offsets únicos e dentro de [1, daysAvailable-1].
  return [...new Set(offsets)].filter((o) => o >= 1 && o < daysAvailable);
}

async function callGemini(apiKey: string, deckTitle: string, cards: CardRow[], count: number): Promise<string[]> {
  const sample = cards
    .slice(0, 30)
    .map((c) => `- ${c.front.slice(0, 200)}`)
    .join("\n");
  const instruction = `Você monta cronogramas de estudo para concursos e idiomas.
A trilha "${deckTitle}" tem estes tópicos (frente dos cards, amostra):
${sample || "(sem cards ainda -- use o nome da trilha)"}

Gere exatamente ${count} títulos curtos de sessão de estudo (até 60 caracteres cada),
em ordem de estudo sugerida (do mais básico ao mais avançado ou revisão final),
cobrindo os tópicos acima sem repetir. Não numere ("Sessão 1" é ruim); prefira
algo como "Revisão: verbos irregulares" ou "Foco: Lei 8.112, Título II".

IDIOMA: português do Brasil, com acentuação correta (é, ã, ç, ô).

Responda SOMENTE com um array JSON de strings, ex.: ["título 1", "título 2"].`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: instruction }] }],
      generationConfig: {
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: { type: "ARRAY", items: { type: "STRING" } },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini respondeu ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((t) => t?.toString().trim().slice(0, 120)).filter(Boolean);
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

  let body: { deckId?: string; examDate?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalido" }, 400);
  }

  const deckId = body.deckId?.toString() ?? "";
  const examDate = body.examDate?.toString() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(deckId)) return json({ error: "deckId invalido" }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return json({ error: "Data da prova invalida" }, 400);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const exam = new Date(`${examDate}T00:00:00Z`);
  const daysAvailable = Math.round((exam.getTime() - today.getTime()) / 86_400_000);
  if (daysAvailable < 2) {
    return json({ error: "Escolha uma data de prova com pelo menos 2 dias de folga." }, 400);
  }
  if (daysAvailable > 365) {
    return json({ error: "Data de prova longe demais (máximo 1 ano)." }, 400);
  }

  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select("id, title")
    .eq("id", deckId)
    .maybeSingle();
  if (deckErr) return json({ error: "Falha ao validar a trilha" }, 400);
  if (!deck) return json({ error: "Trilha nao encontrada" }, 404);

  const { data: cards, error: cardsErr } = await supabase
    .from("cards")
    .select("front, back")
    .eq("deck_id", deckId)
    .neq("state", "suspended")
    .limit(60);
  if (cardsErr) return json({ error: "Falha ao ler os cards da trilha" }, 400);

  const offsets = sessionOffsets(daysAvailable);
  if (offsets.length === 0) {
    return json({ error: "Não foi possível montar sessões para essa data." }, 400);
  }

  const { error: creditErr } = await supabase.rpc("consume_credits", {
    amount: GENERATION_COST,
    reason: "generate-schedule",
  });
  if (creditErr) return json({ error: "Creditos insuficientes", detail: creditErr.message }, 402);

  let titles: string[];
  try {
    titles = await callGemini(apiKey, deck.title, (cards ?? []) as CardRow[], offsets.length);
  } catch (err) {
    await supabase.rpc("refund_credits", { amount: GENERATION_COST, reason: "estorno: falha no Gemini" });
    const code = await logError(supabase, userId, "generate-schedule", 502, (err as Error).message);
    return json(
      { error: "O Faro não conseguiu montar o cronograma agora. Tente novamente em instantes.", code },
      502,
    );
  }

  const sessions = offsets.map((offset, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + offset);
    return {
      date: isoDate(d),
      title: titles[i]?.trim() || `Revisão de ${deck.title} (${i + 1}/${offsets.length})`,
    };
  });

  return json({ sessions, deckTitle: deck.title, examDate });
});
