# ex02 · Variance Cascade

> Conceito (4) **onde a variância se multiplica: autonomia**.

Uma cadeia de 3 passos, onde o output de cada passo vira o prompt do próximo,
rodada 3 vezes em paralelo com `temperature: 1.0` — e **sem nenhum gate** entre
os passos. As três cadeias partem de uma **ideia-semente fixa comum**, então a
variância começa baixa e cresce.

## O que demonstra

Cada chamada autônoma é um fork. A variância de um único passo parece pequena e
inofensiva. Mas como o passo seguinte recebe o output do anterior, os erros não
se somam — eles se **multiplicam**. Partindo de um ponto comum, a similaridade
entre as cadeias cai a cada passo: três execuções da mesma cadeia terminam em
lugares completamente diferentes, sem que nenhum passo individual pareça errado.

## Como rodar

```bash
npm install            # uma vez, na raiz
cd ex02-variance-cascade
npm start
```

## O que observar

- A **árvore de divergência** agrupada por passo: as cadeias A, B e C lado a
  lado em cada etapa.
- A **similaridade média** entre as cadeias caindo passo a passo (barra na
  "ANÁLISE DA CASCATA"): começa alta (ponto de partida comum) e despenca.
- Como cada passo opera sobre um input já diferente do anterior — a divergência
  não se mantém, ela se multiplica.

Esse é o argumento para conter a autonomia: gates, validação por schema e limite
de loops existem porque toda chamada autônoma abre um fork de variância.

## Resultado testado

> Execução real em `2026-06-27` · modelo `claude-sonnet-4-6` · `temperature: 1.0`
> · 3 cadeias em paralelo. Não-determinístico por design; rodada representativa.

```
ANÁLISE DA CASCATA
Similaridade média entre as cadeias, passo a passo:
  passo 1 · plano          █████████░░░░░░░░░░░ 47%
  passo 2 · decomposição   ██████░░░░░░░░░░░░░░ 31%
  passo 3 · risco          ██░░░░░░░░░░░░░░░░░░  9%
```

Partindo de uma ideia-semente **comum**, a similaridade entre as três cadeias
caiu de **47% → 31% → 9%** — uma queda de **38 pontos** em apenas 3 passos. No
passo 1 as cadeias ainda concordavam (todas escolheram a câmera frontal); no
passo 3 cada uma elegeu uma sub-tarefa de risco diferente. Nenhum passo
individual pareceu errado; a trajetória inteira é que divergiu.
