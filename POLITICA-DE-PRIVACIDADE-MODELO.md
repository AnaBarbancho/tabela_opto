# Politica de privacidade - modelo

Este documento e um modelo inicial e deve ser revisado antes do uso comercial.

## Dados tratados pelo software

O software pode armazenar localmente:

- chave de licenca;
- data da ultima validacao;
- identificador local de ativacao;
- registros de sessao preenchidos pelo usuario;
- configuracoes de calibracao.

## Dados enviados ao servidor de licencas

Para validar a licenca, o software envia ao servidor:

- chave de licenca;
- identificador do computador ou identificador local equivalente;
- data e hora aproximada da validacao, registrada pelo servidor.

Esses dados sao usados para ativar, validar, bloquear ou liberar licencas.

## Dados de pacientes

O software possui campo de identificador de paciente para registro local de sessao. Recomenda-se usar codigos, iniciais ou identificadores anonimizados.

O operador do software e responsavel por decidir quais dados inserir e por cumprir a legislacao aplicavel, incluindo regras de sigilo profissional e protecao de dados.

## Armazenamento local

Os registros ficam no armazenamento local do navegador ou aplicativo. A limpeza de dados do navegador, reinstalacao ou troca de computador pode remover informacoes locais.

O usuario deve exportar os registros importantes antes de manutencoes ou limpeza de dados.

## Compartilhamento

Os dados de licenca podem ser processados pelo provedor de infraestrutura usado para validacao, como Supabase.

Dados de sessao nao sao enviados automaticamente ao servidor de licencas, salvo se o software for alterado para incluir esse recurso.

## Seguranca

O sistema usa validacao remota de licenca e nao expoe a chave secreta de servidor no aplicativo do cliente.

Nenhum sistema e totalmente imune a falhas, mau uso, perda de dados ou acesso indevido. O usuario deve manter o computador protegido.

## Retencao

Dados de licenca podem ser mantidos enquanto houver relacao comercial, necessidade de suporte, controle antifraude ou obrigacao legal.

## Contato

Inclua aqui o email, telefone ou canal oficial para solicitacoes de privacidade e suporte.
