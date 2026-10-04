# Guia de licenciamento e instalador

Este projeto ja esta preparado para virar um aplicativo Windows instalavel com Tauri e ativacao por licenca usando Supabase.

## Como o bloqueio funciona

- A primeira ativacao precisa de internet.
- Voce gera uma chave para cada cliente.
- O cliente instala o `.exe`, abre o app e digita a chave.
- A chave e validada na Edge Function do Supabase.
- Na primeira ativacao, a chave fica presa ao identificador daquele computador.
- Se a mesma chave for usada em outro computador, o app recusa.
- Depois de ativado, o app tenta revalidar a licenca a cada 24 horas.
- Se estiver sem internet, ele continua funcionando por ate 30 dias desde a ultima validacao.
- Se voce bloquear a licenca no banco, o app corta o acesso na proxima validacao online.

O Supabase nao precisa receber conexoes o tempo todo. Ele precisa estar disponivel para primeira ativacao, revalidacoes periodicas e bloqueios/liberacoes.

## 1. Criar o projeto no Supabase

Crie um projeto em https://supabase.com.

Depois, na sua maquina, dentro da pasta do projeto:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Isso cria a tabela `public.licenses` usando a migration em:

```text
supabase/migrations/0001_create_licenses.sql
```

## 2. Publicar a funcao de validacao

```bash
supabase functions deploy validate-license
```

A funcao fica em:

```text
supabase/functions/validate-license/index.ts
```

Ela usa a `SUPABASE_SERVICE_ROLE_KEY` no servidor. Essa chave nao fica no app do cliente.

## 3. Configurar o app

Edite `license-check.js` e troque:

```js
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA-ANON-KEY";
```

Use a URL e a anon key do seu projeto Supabase.

A anon key pode ficar no app. A protecao real esta na Edge Function, que usa a service role key somente no servidor.

## 4. Gerar uma licenca

```bash
node scripts/generate-license.js "Nome do Cliente" "email@cliente.com"
```

O comando imprime uma chave e um SQL. Rode esse SQL no editor SQL do Supabase.

## 5. Bloquear uma licenca

```sql
update public.licenses
set status = 'blocked'
where license_key = 'XXXX-XXXX-XXXX-XXXX';
```

O app sera bloqueado na proxima validacao online.

## 6. Liberar a chave para outro computador

Use isso quando o cliente trocar de maquina ou formatar o PC:

```sql
update public.licenses
set status = 'unused',
    hardware_id = null,
    activated_at = null,
    last_check_at = null
where license_key = 'XXXX-XXXX-XXXX-XXXX';
```

## 7. Alterar prazo offline

Em `license-check.js`, altere:

```js
const OFFLINE_GRACE_MS = 1000 * 60 * 60 * 24 * 30;
```

O `30` representa 30 dias.

## 8. Rodar em desenvolvimento

Pre-requisitos:

- Node.js
- Rust
- Supabase CLI, apenas para configurar banco/funcoes

Instale dependencias:

```bash
npm install
```

Abra como app desktop:

```bash
npm run dev
```

## 9. Gerar instalador Windows

```bash
npm run build
```

O instalador sera gerado em:

```text
src-tauri/target/release/bundle/nsis
```

## Observacao importante

Nenhum software instalado no computador do cliente e 100% impossivel de burlar. Este modelo impede compartilhamento casual, permite bloquear chaves vazadas e vincula cada licenca a um computador, que e o caminho pratico para vender esse tipo de aplicativo.
