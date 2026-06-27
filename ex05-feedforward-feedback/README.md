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
