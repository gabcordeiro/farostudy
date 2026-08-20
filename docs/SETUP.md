# Setup - Auth + Gemini

## 1. Variaveis de ambiente (Vercel)

Este projeto usa **Vite**, entao o prefixo e `VITE_` (NAO `NEXT_PUBLIC_`).
Em Vercel > Project > Settings > Environment Variables, defina:

| Nome                     | Valor                                             |
| ------------------------ | ------------------------------------------------- |
| `VITE_SUPABASE_URL`      | `https://sfzwudfivragjmqaxjrh.supabase.co`        |
| `VITE_SUPABASE_ANON_KEY` | sua chave **anon/publishable** (a publica)        |

> A chave publica (anon / `sb_publishable_...`) pode ficar no frontend: quem
> protege os dados e a RLS. Nunca use a `service_role` / `secret` no cliente.

Depois de salvar, faca um **Redeploy** para o Vite reconstruir com as envs.

## 2. Auth - Email/Senha

Ja funciona so com a migration aplicada. Em Supabase > Authentication >
Providers, mantenha **Email** habilitado. Para exigir confirmacao por e-mail,
deixe "Confirm email" ligado (o cadastro entao mostra o aviso de verificacao).

Em Authentication > URL Configuration:

- **Site URL**: `https://farostudy.vercel.app`
- **Redirect URLs**: adicione `https://farostudy.vercel.app/auth/callback`
  (e `http://localhost:5173/auth/callback` para dev).

## 3. Auth - Google OAuth

1. Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web).
   - **Authorized redirect URI**:
     `https://sfzwudfivragjmqaxjrh.supabase.co/auth/v1/callback`
2. Supabase > Authentication > Providers > **Google**: cole o Client ID e o
   Client Secret e habilite.
3. O botao "Continuar com o Google" ja aponta para `/auth/callback`.

## 4. Gemini (edge function segura)

A chave do Gemini vive **so no servidor** (nunca no browser).

```bash
supabase functions deploy generate-cards

supabase secrets set \
  GEMINI_API_KEY=SUA_CHAVE_GEMINI \
  APP_ORIGIN=https://farostudy.vercel.app
```

`SUPABASE_URL` e `SUPABASE_ANON_KEY` ja sao injetadas automaticamente no
runtime das edge functions.

Teste pela pagina **Importar** (`/importar`): escolha/crie uma trilha, cole um
texto e clique em "Gerar cards". A funcao valida seu login, chama o Gemini e
grava os cards na sua trilha via RLS.

## 5. Migracao 0002 (bucket de avatares)

Necessaria para a pagina `/perfil` (foto de perfil).

- Supabase > SQL Editor > New query > cole o conteudo de
  `supabase/migrations/0002_avatars.sql` e rode. Pode rodar mais de uma vez sem
  efeito colateral (idempotente).

## 6. Deploy da funcao Quiz (`generate-quiz`)

Ja esta no workflow `deploy-supabase-functions.yml`. Depois deste commit:

- GitHub > Actions > **Deploy Supabase Edge Functions** > **Run workflow** na
  branch da PR (ou em `main` apos o merge).
- Os secrets `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_ID` que voce ja tem
  cobrem as duas functions (`generate-cards` e `generate-quiz`).

Nao precisa criar novos secrets no Supabase: `generate-quiz` usa o mesmo
`GEMINI_API_KEY` que voce ja salvou.

## 7. Tema, fonte e login

- **Tema**: toggle 3-vias (Claro / Sistema / Escuro) na sidebar; a escolha e
  guardada em `localStorage` e aplicada antes do primeiro paint (sem flash).
- **Fonte**: Roboto (400/500/700), carregada via Google Fonts em `index.html`.
- **Login persistente**: ja e o comportamento default via `persistSession=true`
  no client Supabase. O `AuthProvider` tambem chama `refreshSession()` no boot
  para renovar o token e evitar o erro "JWT issued at future" (clock skew).

## 8. Papeis de usuario e creditos (migrations 0004 e 0005)

Ja aplicadas no projeto (`sfzwudfivragjmqaxjrh`) via MCP. Se for replicar em
outro projeto Supabase, rode na ordem pelo SQL Editor:
`0004_roles_and_credits.sql` depois `0005_refund_credits.sql`.

O que isso cria:

- `profiles.role` (`user` | `admin`). Toda conta nova nasce `user`.
- `credit_ledger` (livro-razao append-only) + `v_credit_balance` (saldo).
- `credit_plans` (planos publicos) + `credit_requests` (pedido de compra).
- RPCs `security definer`: `consume_credits`, `refund_credits`,
  `grant_credits`, `set_user_role`, `resolve_credit_request`,
  `admin_list_users`.

**Tornar alguem admin** (nao tem UI para o primeiro admin, e ovo-e-galinha):
no SQL Editor,
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```
Depois disso a pessoa ve o link **Admin** na sidebar (`/admin`), com abas de
Usuarios, Solicitacoes e Planos.

**Custo de credito**: cada chamada a `generate-cards` ou `generate-quiz`
consome 1 credito (`GENERATION_COST` no topo de cada `index.ts`). Se o Gemini
falhar depois de ja ter cobrado, a function estorna automaticamente via
`refund_credits`.

## 9. Pagamento via Mercado Pago (Checkout Pro)

O codigo esta pronto e publicado. Falta so a configuracao, que depende de
credenciais que so o dono da conta tem.

**Fluxo**: `/planos` > botao "Comprar" > edge function `create-payment` cria a
cobranca e devolve a URL do Checkout Pro > o usuario paga (Pix ou cartao) >
o Mercado Pago chama a edge function `mercadopago-webhook` > ela confere o
pagamento na API e chama `settle_mercadopago_payment`, que lanca os creditos.

O retorno do navegador (`/planos?pagamento=approved`) e so navegacao: quem
credita e o webhook. Por isso a mensagem na tela fala em "confirmando", sem
prometer saldo que ainda nao entrou.

**Passo a passo:**

1. No painel do Mercado Pago (Suas integracoes > sua aplicacao), copie o
   **Access Token**. Comece pelo de **teste**; troque pelo de producao depois
   de validar com os cartoes de teste.
2. Em Notificacoes > **Webhooks**, cadastre a URL abaixo e assine o evento
   `payment`. O painel gera uma **chave secreta** -- copie tambem.
   ```
   https://<project-ref>.supabase.co/functions/v1/mercadopago-webhook
   ```
3. No painel do Supabase, em Edge Functions > Secrets, defina:
   ```
   MERCADOPAGO_ACCESS_TOKEN=<access token>
   MERCADOPAGO_WEBHOOK_SECRET=<chave secreta do webhook>
   APP_ORIGIN=https://farostudy.vercel.app
   ```
   `SUPABASE_SERVICE_ROLE_KEY` ja e injetada automaticamente nas functions.
4. Teste com as **contas e cartoes de teste** do painel. Confira em
   `/admin` ou direto na tabela `payments` que a linha ficou `approved` e que
   entrou uma (uma so) linha em `credit_ledger`.

> **Marque so o evento "Pagamentos"** na lista do painel. A function trata
> apenas `type: "payment"` e responde "ignorado" para qualquer outro; assinar
> os demais so gera chamadas descartadas.
>
> **Teste e producao tem segredos diferentes.** O painel separa "Modo de
> teste" e "Modo de producao", cada um com sua assinatura secreta. O segredo
> guardado no Supabase precisa ser do mesmo modo do access token, senao toda
> notificacao e rejeitada com 401 na validacao de assinatura.
>
> **O botao "Simular notificacao" nao prova muita coisa.** Ele manda um id de
> pagamento que nao existe na API real, entao a function responde
> `200 {"ignored": true, "reason": "payment_not_found"}`. Isso e o certo, nao
> uma falha -- e a resposta 200 e proposital, para a notificacao sair da fila
> em vez de ser reentregue para sempre. O teste que vale e pagar com cartao
> de teste de verdade.

**Politica de retentativa** (`mercadopago-webhook`): o Mercado Pago reenfileira
a notificacao a cada resposta que nao for 2xx. Por isso a function so devolve
erro quando repetir tem chance de resolver:

| Situacao | Resposta | Por que |
| --- | --- | --- |
| Pagamento nao existe (404) | 200 | Nunca vai existir; retentar e inutil |
| Credencial rejeitada (401/403) | 200 + log | Pede correcao de config, nao fila |
| `external_reference` desconhecida | 200 | UUID valido que nao e nosso |
| Rate limit / erro do MP (429, 5xx) | 502 | Transitorio: retentar ajuda |
| Erro de banco | 500 | Transitorio: retentar ajuda |

**Por que uma RPC nova em vez de `grant_credits`**: `grant_credits` exige
`is_admin(auth.uid())`, e o webhook roda com service-role, onde `auth.uid()`
e NULL. Dai a `settle_mercadopago_payment` (migracao `0007_payments.sql`),
que tambem e **idempotente** -- o Mercado Pago reenvia a mesma notificacao
varias vezes, e sem isso o cliente ganharia credito repetido a cada reenvio.
A trava e dupla: a funcao sai cedo se o pagamento ja estiver aprovado, e ha
um indice unico em `(provider, provider_payment_id)` no banco.

**Fluxo manual continua vivo** como reserva: o link "Pedir aprovacao manual"
em `/planos` cria um pedido que aparece em `/admin` > Solicitacoes. Serve
para cortesia, correcao de erro ou se o gateway estiver fora do ar.

**Pendencia que nao e de codigo**: para cobrar de forma regular no Brasil e
emitir nota fiscal de servico, e preciso CNPJ (um MEI ja resolve). Sem isso,
mesmo com o gateway funcionando, a receita fica sem nota.
