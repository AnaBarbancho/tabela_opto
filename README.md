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
