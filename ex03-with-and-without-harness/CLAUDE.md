# CLAUDE.md — ex03-with-and-without-harness

## Conceito

Conceito (6): **Confiabilidade = Capacidade × Estrutura de Harness**. O mesmo
problema, resolvido com e sem harness, mostra diferença gritante de
confiabilidade. A capacidade do modelo é a mesma dos dois lados; o que muda é a
estrutura ao redor.

## O que este exercício faz

- `src/schema.ts` — o contrato (zod), o texto ambíguo e o **prompt base único**
  usado pelos dois modos. A régua de sucesso é o schema.
- `src/without-harness.ts` — a chamada nua: `JSON.parse` direto, sem strip, sem
  schema, sem retry, sem fallback.
- `src/with-harness.ts` — a MESMA chamada base + saída estruturada (strip de
  cercas) + validação zod + retry com backoff (devolvendo o erro ao modelo) +
  fallback estruturado.
- `src/run-comparison.ts` — roda cada modo 5× e imprime as taxas de sucesso.
  É o `npm start`.

## Restrições arquiteturais (NÃO violar)

- `without-harness.ts` é **intencionalmente frágil**. Não adicione strip de
  cercas, validação, retry ou try/catch defensivo nele. A fragilidade é o ponto
  de comparação.
- O **prompt base é idêntico** nos dois modos. A diferença é só a estrutura ao
  redor da chamada — não o prompt. Mantenha assim.
- O texto de entrada precisa ser ambíguo o suficiente para provocar falhas no
  modo sem harness (enum em português, número por extenso, período omitido).

## Modelo

`claude-sonnet-4-6` (default). Não usa `temperature`, então qualquer modelo
serve — mas mantenha o default para consistência com os outros exercícios.
