# ex05 · Feedforward & Feedback

> Conceito (9) **Guides previnem antes; Sensors detectam depois**.

As duas camadas, fisicamente separadas em arquivos, orquestradas num pipeline:
`Guides → Model Call → Sensors`.

## O que demonstra

- **Guides (feedforward)** entram no system prompt *antes* da chamada e reduzem a
  chance do erro: instruções, conhecimento (few-shot) e restrições.
- **Sensors (feedback)** rodam *depois* da resposta e flagram o erro: validação
  de schema, campos obrigatórios e detecção simples de alucinação.

São opostos e complementares. Sem guides, o agente erra livremente. Sem sensors,
você não fica sabendo. A contenção real vem das duas juntas.

## Como rodar

```bash
npm install            # uma vez, na raiz
cd ex05-feedforward-feedback
npm start
```

## O que observar

O pipeline roda três configurações sobre a mesma mensagem de cliente:

1. **sem guides · sem sensors** — saída crua, possivelmente fora do formato ou
   com detalhe inventado, e ninguém percebe.
2. **sem guides · com sensors** — o erro ainda acontece, mas os sensores o
   **detectam** (detecção sem prevenção).
3. **com guides · com sensors** — os guides **previnem** e os sensores
   **verificam**.

Repare em cada `[Guides]`, `[Model]` e `[Sensors]` impressos separadamente — é a
arquitetura das duas camadas tornada visível.

## Resultado testado

> Execução real em `2026-06-27` · modelo `claude-sonnet-4-6` · mesma mensagem de
> cliente nas três configs. Não-determinístico; rodada representativa.

```
CONFIG 1 · sem guides · sem sensors
  [Model]   ticket gigante embrulhado em ```json (fora do contrato)
  [Sensors] AUSENTES — o que saiu, saiu, e ninguém sabe se está certo.

CONFIG 2 · sem guides · COM sensors
  [Model]   de novo um JSON enorme em ```json
  [Sensors] ✘ schema  ✘ campos  ✔ alucinacao
            → 2 sensores acusaram problema. CONTIDO antes de virar dado ruim.

CONFIG 3 · COM guides · COM sensors
  [Model]   {"categoria":"financeiro","prioridade":"alta","resumo":"..."}
  [Sensors] ✔ schema  ✔ campos  ✔ alucinacao
            → todos passaram. Output liberado.
```

As três camadas ficam visíveis lado a lado. Sem guides, o modelo produziu um
ticket verboso e fora do contrato nas configs 1 e 2 — a diferença é que na 2 os
**sensores detectaram** (2 de 3 acusaram), enquanto na 1 o erro passou
despercebido. Na config 3 os **guides preveniram**: a resposta já saiu como o JSON
mínimo esperado, e os sensores apenas confirmaram. Detecção sem prevenção contém o
estrago; prevenção + detecção é a contenção real.
