# Checklist de comercializacao

Use este arquivo como roteiro antes de vender e para cada nova instalacao em cliente.

## Estado atual

- Instalador Windows gerado com sucesso em `src-tauri/target/release/bundle/nsis/Tabela de Optotipos_0.1.0_x64-setup.exe`.
- Supabase CLI instalado e funcional.
- Edge Function `validate-license` publicada no projeto Supabase `gyimwqhlmkjhpknekbno`.
- Banco remoto Supabase esta atualizado com as migrations locais.
- Endpoint de validacao testado com chave falsa e resposta esperada: `not_found`.
- App configurado para validar licencas via Supabase em `license-check.js`.
- Banco, Edge Function e scripts de licenca existem no projeto.

## Antes da primeira venda

- Testar o instalador em um computador Windows limpo.
- Confirmar que a primeira ativacao exige internet.
- Confirmar que o app abre normalmente depois da ativacao.
- Confirmar que a mesma licenca e recusada em outro computador.
- Confirmar que uma licenca bloqueada no Supabase corta acesso na proxima validacao.
- Testar uso offline depois de ativado.
- Revisar nome do produto, icone, versao e dados comerciais.
- Definir preco, prazo de suporte, regra de troca de computador e politica de reembolso.
- Preparar termos de uso e politica de privacidade.
- Revisar os modelos `TERMOS-DE-USO-MODELO.md` e `POLITICA-DE-PRIVACIDADE-MODELO.md` com apoio juridico antes de publicar.
- Definir se o executavel sera assinado digitalmente.

## Publicar infraestrutura Supabase

1. Vincule o projeto Supabase:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
```

2. Aplique a migration:

```bash
npx supabase db push
```

3. Publique a Edge Function:

```bash
npx supabase functions deploy validate-license
```

4. No painel do Supabase, confirme que existe a tabela `public.licenses`.

5. Confirme que a funcao `validate-license` responde sem expor a `service_role key` no app.

## Gerar licenca para cliente

```bash
node scripts/generate-license.js "Nome do Cliente" "email@cliente.com"
```

O comando imprime uma chave e um SQL. Rode o SQL no editor SQL do Supabase.

Guarde para controle:

- nome do cliente;
- email;
- chave gerada;
- data da venda;
- computador ativado, quando aplicavel;
- observacoes de suporte.

## Entrega ao cliente

- Enviar o instalador `.exe`.
- Enviar a chave de licenca.
- Informar que a primeira ativacao precisa de internet.
- Orientar que a licenca e vinculada a um computador.
- Informar que troca de computador exige liberacao da chave.
- Enviar instrucoes basicas de calibracao do monitor.

## Teste de aceite em cada cliente

- Instalar o app.
- Inserir a chave.
- Abrir a tela principal.
- Fazer calibracao fisica do monitor.
- Conferir uma linha de referencia, por exemplo 20/20 a 6 m.
- Fechar e abrir novamente.
- Exportar um CSV de teste, se o cliente for usar registro de sessao.

## Bloquear licenca

```sql
update public.licenses
set status = 'blocked'
where license_key = 'XXXX-XXXX-XXXX-XXXX';
```

## Liberar licenca para outro computador

```sql
update public.licenses
set status = 'unused',
    hardware_id = null,
    activated_at = null,
    last_check_at = null
where license_key = 'XXXX-XXXX-XXXX-XXXX';
```

## Pontos legais e tecnicos

- Evite vender como dispositivo medico validado sem validacao tecnica e regulatoria adequada.
- Posicione como ferramenta auxiliar, salvo se houver documentacao tecnica que sustente outro enquadramento.
- Nao colete dados sensiveis de pacientes sem procedimento de protecao de dados.
- Oriente o cliente a usar identificadores anonimizados no campo de paciente.
- Documente limitacoes de monitor, distancia, luminancia, contraste, iluminacao e calibracao.

## Proximas melhorias recomendadas

- Assinar digitalmente o instalador Windows.
- Criar um painel simples para emitir, bloquear e liberar licencas sem usar SQL manual.
- Automatizar backup da tabela `licenses`.
- Criar uma pagina de download e suporte.
- Adicionar um termo de uso exibido na primeira abertura.
