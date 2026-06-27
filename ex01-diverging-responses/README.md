# ex01 · Diverging Responses

> Conceitos (1) **paradoxo da demonstração local** e (3) **natureza dupla da
> caixa preta**.

O mesmo prompt, rodado 5 vezes contra a API **crua**, produz respostas
estruturalmente diferentes. Não há schema, retry ou validação — é o modelo nu.

## O que demonstra

Capacidade e variância vêm da mesma fonte. Um texto ambíguo, sem schema
especificado, faz cada execução "decidir" sozinha quais campos extrair e como
nomeá-los. A demo que funcionou na primeira vez quebra na segunda — o código não
mudou, o resultado do modelo mudou.

## Como rodar

```bash
# a partir da raiz do repo, com .env já configurado:
npm install            # uma vez
cd ex01-diverging-responses
npm start
```

## O que observar

- As **respostas lado a lado**: nomes de campos diferentes, aninhamentos
  diferentes, às vezes um JSON que nem parseia.
- A **matriz de presença de campos**: quais chaves aparecem em quais execuções.
- A contagem de **estruturas distintas**: quantos formatos diferentes saíram
  para o mesmo input.

Rode duas ou três vezes. Se em uma rodada convergir, a próxima quase certamente
diverge — a variância não é bug, é termodinâmica. Sem um harness (schema +
validação) você não tem como garantir qual formato chega ao seu sistema.
