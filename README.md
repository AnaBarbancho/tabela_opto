# Sistema de Optotipos Snellen

Aplicacao local para gerar tabela de optotipos baseada em Snellen, com tamanhos calculados para testes a 3 metros e 6 metros.

## Como usar

Abra `index.html` no navegador.

Recursos incluidos:

- distancia de teste em 3 m ou 6 m;
- letras, simbolos infantis, E direcional e C de Landolt;
- sequencia classica, balanceada ou aleatoria;
- modo de linha unica;
- controle de contraste;
- impressao da tabela;
- painel com tamanho em milimetros de cada linha.

## Calculo

A altura total do optotipo e calculada para subtender 5 minutos de arco. Para uma linha `20/x`, o tamanho cresce proporcionalmente a `x / 20`.

Exemplo de conferencia:

```bash
python snellen_calculator.py
```

Valores esperados para 20/20:

- 3 m: aproximadamente 4,36 mm;
- 6 m: aproximadamente 8,73 mm.

## Observacao

Este sistema serve para apoio e triagem. Para uso clinico, calibre a impressao fisicamente com regua, controle iluminacao, contraste, distancia real e consulte um profissional habilitado.
