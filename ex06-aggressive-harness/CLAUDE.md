# CLAUDE.md — ex06-aggressive-harness

## Conceito

Conceito (12): **A Lição Amarga / o preço arquitetural**. Harness em excesso
bloqueia a capacidade nativa do modelo. Restrição demais também é uma falha
arquitetural — o andaime construído para um modelo fraco vira gargalo quando o
modelo evolui.

## O que este exercício faz

Roda o mesmo agente de sumarização em dois modos, sobre o MESMO texto (escolhido
por ser cheio de nuance: trade-offs, ressalvas e uma recomendação condicional):

- **Modo restrito** — system prompt com 16 regras rígidas: limite fixo de
  palavras, formato obrigatório, palavras proibidas (justamente as que carregam
  nuance), lista fechada de tópicos.
- **Modo calibrado** — apenas as restrições essenciais ao contexto.

Imprime os dois lado a lado e um comentário explícito do que foi sacrificado:
quais marcadores de nuance sobreviveram no calibrado mas se perderam no restrito.

## Restrições arquiteturais (NÃO violar)

- O modo restrito deve permanecer **exageradamente** restritivo (15+ regras) — é
  o ponto. Não o "melhore"; ele precisa estrangular a capacidade do modelo para
  o contraste ficar visível.
- O texto de entrada precisa conter nuance real (trade-offs, ressalvas,
  recomendação condicional) — é o que o harness agressivo destrói.
- O objetivo NÃO é dizer que harness é ruim. É mostrar que harness mal
  calibrado (rígido demais) é tão problemático quanto a ausência dele.

## Modelo

`claude-sonnet-4-6` (default). Não usa `temperature`.
