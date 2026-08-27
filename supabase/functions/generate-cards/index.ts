// =============================================================================
// Edge Function: generate-cards
// Gera flashcards a partir de texto/JSON usando a API do Google Gemini.
//
// Seguranca:
//  - GEMINI_API_KEY vive SOMENTE aqui (Deno.env), nunca no frontend. (#1)
//  - Exige o JWT do usuario; o insert usa um client com esse token, entao a RLS
//    garante que os cards so entram no deck do proprio usuario. (#6, #7)
//  - Valida todo o input e apara a saida antes de gravar. (#14, #17)
//
// Deploy:
//   supabase functions deploy generate-cards
//   supabase secrets set GEMINI_API_KEY=xxxx APP_ORIGIN=https://farostudy.vercel.app
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { logError } from "../_shared/errorLog.ts";

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GENERATION_COST = 1;

interface GeneratedCard {
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
}

const MAX_CONTENT = 50_000;

function clampCard(c: GeneratedCard): GeneratedCard | null {
  const front = (c.front ?? "").toString().trim().slice(0, 8000);
  const back = (c.back ?? "").toString().trim().slice(0, 8000);
  if (!front || !back) return null;
  const hint = c.hint ? c.hint.toString().trim().slice(0, 2000) : undefined;
  const tags = Array.isArray(c.tags)
    ? c.tags.map((t) => t.toString().trim().slice(0, 40)).filter(Boolean).slice(0, 20)
    : [];
  return { front, back, hint, tags };
}

async function callGemini(apiKey: string, content: string, maxCards: number, mode: string) {
  const instruction = `Você é um gerador de flashcards para estudo (concursos e idiomas).
A partir do ${mode === "json" ? "JSON" : "texto"} abaixo, produza até ${maxCards} flashcards
objetivos, sem repetição, com pergunta clara na frente e resposta concisa no verso.

IDIOMA: escreva em português do Brasil com ortografia e acentuação corretas.
Use acentos e cedilha sempre que a palavra exigir (é, á, ã, ó, ê, ç, ú, í).
Nunca escreva "e" no lugar de "é", nem omita acentos para simplificar.

DICA (campo "hint", opcional): uma pista PARCIAL que ajuda a lembrar sem entregar a
resposta -- uma palavra-chave, uma categoria, o começo do raciocínio. NUNCA escreva a
resposta nem uma reformulação/paráfrase dela como dica -- isso anula o propósito (o
estudante vê a "dica" e já sabe a resposta sem ter praticado a lembrança). Se não der
pra pensar numa dica que não entregue a resposta, deixe o campo vazio.

Responda SOMENTE com um array JSON de objetos {front, back, hint, tags}.
Conteúdo:
"""${content}"""`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: instruction }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              front: { type: "STRING" },
              back: { type: "STRING" },
              hint: { type: "STRING" },
              tags: { type: "ARRAY", items: { type: "STRING" } },
            },
            required: ["front", "back"],
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini respondeu ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const parsed = JSON.parse(text) as GeneratedCard[];
  return Array.isArray(parsed) ? parsed : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "GEMINI_API_KEY nao configurada" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Nao autenticado" }, 401);

  // Client com o token do usuario -> RLS aplicada nos inserts.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Sessao invalida" }, 401);
  const userId = userData.user.id;

  let body: { deckId?: string; mode?: string; content?: string; maxCards?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalido" }, 400);
  }

  const deckId = body.deckId?.toString() ?? "";
  const mode = ["text", "json", "file"].includes(body.mode ?? "") ? body.mode! : "text";
  const content = (body.content ?? "").toString();
  const maxCards = Math.min(100, Math.max(1, Number(body.maxCards) || 20));

  if (!/^[0-9a-f-]{36}$/i.test(deckId)) return json({ error: "deckId invalido" }, 400);
  if (content.trim().length === 0) return json({ error: "Conteudo vazio" }, 400);
  if (content.length > MAX_CONTENT) return json({ error: "Conteudo muito longo" }, 413);

  // Confirma que o deck e do usuario (a RLS ja bloquearia, checamos para erro claro).
  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select("id")
    .eq("id", deckId)
    .maybeSingle();
  if (deckErr) return json({ error: "Falha ao validar o deck" }, 400);
  if (!deck) return json({ error: "Deck nao encontrado" }, 404);

  // Cobra 1 credito por geracao (so depois de validar o input, antes de
  // chamar o Gemini -- requisicao invalida nao consome credito).
  const { error: creditErr } = await supabase.rpc("consume_credits", {
    amount: GENERATION_COST,
    reason: "generate-cards",
  });
  if (creditErr) return json({ error: "Creditos insuficientes", detail: creditErr.message }, 402);

  let raw: GeneratedCard[];
  try {
    raw = await callGemini(apiKey, content, maxCards, mode);
  } catch (err) {
    // Falha no Gemini apos ja ter cobrado -> devolve o credito.
    await supabase.rpc("refund_credits", { amount: GENERATION_COST, reason: "estorno: falha no Gemini" });
    // O erro cru (ex.: "Gemini respondeu 503: {...}") nao vai pro cliente --
    // fica em error_logs, so o admin ve. O cliente recebe uma mensagem
    // generica + o codigo, para poder relatar o problema sem expor detalhe
    // tecnico nenhum.
    const code = await logError(supabase, userId, "generate-cards", 502, (err as Error).message);
    return json(
      { error: "O Faro não conseguiu gerar os cards agora. Tente novamente em instantes.", code },
      502,
    );
  }

  const rows = raw
    .map(clampCard)
    .filter((c): c is GeneratedCard => c !== null)
    .slice(0, maxCards)
    .map((c) => ({
      user_id: userId,
      deck_id: deckId,
      front: c.front,
      back: c.back,
      hint: c.hint ?? null,
      tags: c.tags ?? [],
      source: mode === "json" ? "ai_json" : mode === "file" ? "ai_file" : "ai_text",
    }));

  if (rows.length === 0) return json({ created: 0, cards: [] });

  const { data: inserted, error: insErr } = await supabase
    .from("cards")
    .insert(rows)
    .select("id, front, back");
  if (insErr) {
    const code = await logError(supabase, userId, "generate-cards", 400, insErr.message);
    return json({ error: "Não foi possível salvar os cards.", code }, 400);
  }

  // Trim da resposta: devolve so o essencial. (#17)
  return json({ created: inserted?.length ?? 0, cards: inserted ?? [] });
});
