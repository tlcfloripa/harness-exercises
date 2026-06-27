# CLAUDE.md — ex01-diverging-responses

## Conceito

Conceitos (1) e (3) do workshop: **o paradoxo da demonstração local** e **a
natureza dupla da caixa preta**. O mesmo prompt, rodado N vezes contra a API
crua, produz respostas estruturalmente diferentes. Capacidade e variância saem
da mesma fonte.

## O que este exercício faz

- Envia **o mesmo** prompt de extração (texto ambíguo, sem schema definido) para
  a API **5 vezes em paralelo**.
- Imprime as respostas lado a lado.
- Calcula uma métrica de divergência: matriz de presença/ausência de campos e
  número de estruturas JSON distintas.

## Restrição arquitetural (NÃO violar)

Este é um exercício de **API crua**. Não há — e não pode haver — schema
enforcement, retry ou validação. O `stripFences` + `JSON.parse` existe apenas
para *medir* a divergência; ele não corrige nem normaliza o output. Respostas
não-parseáveis são contabilizadas como sinal, não como erro a ser tratado.

Se for editar: mantenha o prompt propositalmente subespecificado. A divergência
vem justamente de não dizer ao modelo qual schema usar.

## Arquivos

- `src/exercise.ts` — o experimento completo.

O cliente Anthropic + carregamento do `.env` vem de `@harness/client`
(`packages/client`), compartilhado por todos os exercícios via npm workspace.
