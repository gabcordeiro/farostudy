# Faro Cards

Plataforma de repeticao espacada (estilo Anki) focada em concursos publicos e
aprendizado de idiomas. Gera flashcards com IA, importa colecoes `.apkg`,
organiza trilhas por edital e acompanha a evolucao com paineis de consistencia
e retencao.

Stack: **React + TypeScript (Vite)**, **Tailwind CSS**, **Supabase**
(Postgres, Auth, RLS, Storage) e **Google Gemini** para geracao de cards.

---

## Estrutura de pastas

```
faro-cards/
├── index.html                 # meta base, fontes proprias, favicon set
├── vercel.json                # security headers, HTTPS/HSTS, CSP, SPA rewrites
├── .env.example               # apenas chaves publicas (VITE_*)
├── .github/workflows/ci.yml   # typecheck + lint + build + npm audit
├── public/
│   ├── faro-mascot.svg         # placeholder do mascote (trocar por .png final)
│   ├── favicon.svg
│   ├── site.webmanifest
│   ├── robots.txt
│   └── sitemap.xml
├── supabase/
│   └── migrations/
│       └── 0001_init.sql       # tabelas + RLS + views de BI + bucket .apkg
└── src/
    ├── main.tsx                # BrowserRouter + HelmetProvider
    ├── App.tsx                 # rotas, layout, sticky mobile CTA, cookie banner
    ├── index.css               # base do design system (dark, sem branco puro)
    ├── lib/
    │   ├── env.ts              # leitura validada (Zod) das envs publicas
    │   ├── supabase.ts         # client anon-only (PKCE)
    │   ├── database.types.ts   # tipos do banco (gerar via CLI em producao)
    │   ├── validation.ts       # esquemas Zod (cards, decks, upload .apkg...)
    │   ├── sanitize.ts         # escape/anti-XSS do conteudo dos cards
    │   └── srs.ts              # SM-2 e curva de esquecimento (Ebbinghaus)
    ├── components/
    │   ├── icons.tsx           # icones proprios em SVG (sem Lucide)
    │   ├── Mascot.tsx          # mascote Faro (sempre com alt text)
    │   ├── Skeleton.tsx        # skeleton loaders (nunca spinner)
    │   ├── SEO.tsx             # meta title/description por pagina
    │   ├── Sidebar.tsx         # logo = mascote
    │   ├── EmptyState.tsx      # empty states com o mascote
    │   └── CookieBanner.tsx
    ├── features/
    │   └── dashboard/          # <-- DELIVERABLE principal
    │       ├── Dashboard.tsx           # shell + stat tiles + estados
    │       ├── ConsistencyHeatmap.tsx  # heatmap estilo GitHub (ofensiva)
    │       ├── RetentionBI.tsx         # curva de esquecimento + ranking
    │       ├── useDashboardData.ts     # agrega das views de BI
    │       └── dashboard.types.ts
    └── pages/
        ├── NotFound.tsx        # 404 custom
        ├── Privacy.tsx
        ├── Terms.tsx
        └── ThankYou.tsx
```

## Banco de dados (Supabase)

`supabase/migrations/0001_init.sql` cria:

| Tabela / view              | Papel                                                     |
| -------------------------- | --------------------------------------------------------- |
| `profiles`                 | 1:1 com `auth.users`, timezone, consentimentos            |
| `categories`               | Categorias de edital (ex: "Tecnologia da Informacao")     |
| `decks`                    | Trilhas de estudo (blocos de topicos)                     |
| `cards`                    | Flashcards + estado SRS (due, interval, ease, reps)       |
| `reviews`                  | Log append-only de revisoes (alimenta o BI)               |
| `import_jobs`              | Rastreio de importacao `.apkg` / geracao por IA           |
| `v_daily_activity`         | View (security_invoker) para o heatmap                    |
| `v_retention_by_category`  | View (security_invoker) para a curva de retencao          |
| bucket `apkg-imports`      | Storage privado, 50 MB, MIME restrito                     |

**RLS estrito:** toda tabela trava em `auth.uid() = user_id`; triggers
`security definer` impedem apontar `deck_id`/`category_id` para registros de
outro usuario (anti field-tampering). `reviews` so aceita `insert` do proprio
dono. As views usam `security_invoker = on`, entao herdam a RLS.

Aplicar:

```bash
supabase db push          # ou: supabase migration up
supabase gen types typescript --project-id <id> > src/lib/database.types.ts
```

## Rodando localmente

```bash
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Design system (regras anti-template)

- **Dark por padrao**, fundo Slate (`#0B0F17`), nunca branco puro. Tom claro = `paper` (`#E7EAF0`).
- **Indigo = foco**, **Laranja = acoes/CTA**. Sem arco-iris, neon ou pastel.
- **Cantos definidos** (radius <= 6px), sombras sutis e unicas.
- **Fontes proprias**: Sora (UI) + Fraunces (display) — sem Inter/Geist/Space Grotesk.
- **Icones proprios** em SVG (sem Lucide, sem sparkles).
- **Skeleton loaders** em vez de spinners; empty/loading states usam o mascote.

## Seguranca

Chaves so publicas no front (`VITE_*`); segredos (Gemini, service role) ficam em
Edge Functions. RLS + lock por dono, validacao Zod no front e no back, escape de
conteudo de card (anti-XSS), upload `.apkg` restrito por tamanho/tipo, security
headers + HSTS + CSP no `vercel.json`, e `npm audit` no CI.

> O mascote enviado (PNG transparente) deve ser colocado em
> `public/faro-mascot.png` e o `DEFAULT_SRC` de `src/components/Mascot.tsx`
> atualizado. Um placeholder SVG ja acompanha o repo para renderizar de imediato.
