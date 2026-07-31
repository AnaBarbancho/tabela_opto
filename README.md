# Sistema de Optotipos Snellen

Aplicação local para apresentação de optótipos Snellen e ETDRS/logMAR, com cálculo angular e calibração física do monitor.

## Como usar

Abra `index.html` no navegador.

Recursos incluídos:

- distância de teste de 1 a 20 m, com atalhos para 3 e 6 m;
- protocolos Snellen e ETDRS/logMAR;
- letras, símbolos, E direcional e C de Landolt;
- sequência balanceada ou aleatória e modo de linha única;
- calibração por régua: converte a medida angular em pixels físicos da tela;
- apresentação em tela cheia e navegação por teclado;
- registro local de sessão e exportação CSV.

## Calibração obrigatória

1. Abra a aplicação no **monitor que será usado no exame**, em resolução e escala definitivas.
2. Meça o comprimento total da barra preta de calibração com uma régua física.
3. Informe a medida observada em milímetros e salve. Não use o valor em pixels ou a largura da tela.
4. Confirme com uma régua que a altura mostrada para 20/20 corresponde ao valor informado pelo painel.

A calibração é específica para navegador, monitor, resolução e escala do sistema operacional. Repita-a ao trocar qualquer um deles. Sem calibração, a aplicação mostra a tabela, mas não deve ser usada para medir acuidade. Valores exibidos como “mm teóricos” descrevem apenas o cálculo angular; passam a corresponder ao tamanho físico somente após a calibração.

## Calculo

A altura total do optotipo e calculada para subtender 5 minutos de arco. Para uma linha `20/x`, o tamanho cresce proporcionalmente a `x / 20`.

Exemplo de conferencia:

```bash
python snellen_calculator.py
```

Valores esperados para 20/20:

- 3 m: aproximadamente 4,36 mm;
- 6 m: aproximadamente 8,73 mm.

## Limites e validação

Este projeto implementa o cálculo geométrico e controles operacionais, mas não constitui, por si só, um dispositivo médico validado. Antes de uso profissional, a responsabilidade técnica deve definir e documentar: optótipos com desenho padronizado/validado, luminância e contraste do monitor, iluminação do ambiente, distância real, critério de pontuação, segurança dos dados e requisitos regulatórios aplicáveis.

Os resultados são guardados no armazenamento local do navegador; exporte-os antes de limpar os dados do navegador e não utilize identificadores sensíveis sem um procedimento de proteção de dados adequado.

## Licenciamento e empacotamento (venda do software)

Estrutura pronta para transformar o app em um `.exe` com Windows com ativação por licença vinculada ao computador.

### 1. Banco de dados (Supabase)

Quando tiver um projeto Supabase escolhido, aplique a migration:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Isso cria a tabela `public.licenses` ([supabase/migrations/0001_create_licenses.sql](supabase/migrations/0001_create_licenses.sql)).

### 2. Deploy da função de validação

```bash
supabase functions deploy validate-license
```

A função ([supabase/functions/validate-license/index.ts](supabase/functions/validate-license/index.ts)) usa a `SUPABASE_SERVICE_ROLE_KEY` (já disponível automaticamente no ambiente de Edge Functions do Supabase) — nunca fica exposta no cliente.

### 3. Gerar uma licença para um cliente

```bash
node scripts/generate-license.js "Nome do Cliente" "email@cliente.com"
```

Copie o SQL impresso e rode no SQL editor do Supabase (ou via `execute_sql`).

### 4. Configurar o app com o projeto Supabase

Edite [license-check.js](license-check.js) e preencha:

```js
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA-ANON-KEY";
```

Essa `anon key` é pública por natureza (é feita para ficar no client); a proteção real está na Edge Function + `service_role` no servidor.

### 5. Empacotar como aplicativo Windows (Tauri)

Pré-requisitos: [Rust](https://rustup.rs) e Node.js instalados.

```bash
npm install
npm run tauri icon caminho/para/seu-logo.png   # gera os icones em src-tauri/icons
npm run build                                   # gera o instalador .exe em src-tauri/target/release/bundle/nsis
```

Em desenvolvimento, para testar a janela do app:

```bash
npm run dev
```

### Como funciona a ativação

1. Cliente instala o `.exe` e abre o app.
2. É solicitada a chave de licença (`XXXX-XXXX-XXXX-XXXX`).
3. O app lê um identificador do computador (`MachineGuid` do Windows, via comando Rust em [src-tauri/src/main.rs](src-tauri/src/main.rs)) e envia junto com a chave para a Edge Function.
4. Na primeira ativação, a licença é vinculada a esse computador. Em uma segunda máquina, a mesma chave é recusada (`already_activated_elsewhere`).
5. A cada 24h o app revalida a licença silenciosamente; se ela for bloqueada no banco, o acesso é cortado no próximo check.

Para bloquear ou liberar uma licença, basta atualizar a coluna `status` na tabela `licenses` (`'active'`, `'blocked'`).
