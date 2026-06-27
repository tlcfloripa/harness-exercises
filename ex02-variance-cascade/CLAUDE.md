# CLAUDE.md — ex02-variance-cascade

## Conceito

Conceito (4): **onde a variância se multiplica é na autonomia**. Cada decisão
autônoma cujo output alimenta o próximo prompt abre um fork. Sem contenção, a
trajetória do agente diverge irremediavelmente. Variância baixa em cada passo
vira caos de trajetória no conjunto.

## O que este exercício faz

- Simula um agente de **3 passos encadeados** (o output de cada passo é o prompt
  do próximo).
- Roda a cadeia completa **3 vezes em paralelo**, **sem nenhum gate** entre os
  passos.
- Imprime a árvore de divergência agrupada por passo e identifica onde os
  caminhos começaram a se separar.
- Usa `temperature: 1.0` para tornar o efeito visível.

## Restrição arquitetural (NÃO violar)

A ausência de gate entre passos é o ponto. Não adicione validação, normalização
ou "alinhamento" entre os passos — isso seria justamente o harness que o ex03 em
diante demonstra. Aqui queremos ver o fork acontecer cru.

As cadeias partem de uma **ideia-semente fixa comum** (`SEED`) de propósito: é o
que faz a variância começar baixa (similaridade alta no passo 1) e CRESCER nos
passos seguintes. Não troque o passo 1 por uma ideação aberta — isso satura a
divergência logo no início e a "multiplicação" deixa de aparecer na métrica de
similaridade.

`temperature` exige um modelo da família 4.x (Sonnet/Haiku). Opus 4.7/4.8 e
Fable 5 retornam HTTP 400 para `temperature` — mantenha o default do `.env`.

## Arquivos

- `src/exercise.ts` — cadeia de 3 passos × 3 execuções + análise da cascata.

O cliente Anthropic + carregamento do `.env` vem de `@harness/client`
(`packages/client`), compartilhado por todos os exercícios via npm workspace.
