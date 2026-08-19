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
