import { client, MODEL, textOf } from "@harness/client";
import { BASE_PROMPT } from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// SEM harness. A chamada nua: pede, recebe, dá JSON.parse e entrega.
// Nenhuma remoção de cercas, nenhum schema, nenhum retry, nenhum fallback.
// Se o modelo embrulhar em ```json, adicionar prosa, ou usar "médio" no lugar
// de "medium", isso vaza direto para o resto do sistema (ou explode aqui).
// NÃO "consertar" este arquivo — a fragilidade é o ponto.
// ─────────────────────────────────────────────────────────────────────────────
export async function extractWithoutHarness(): Promise<unknown> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: BASE_PROMPT }],
  });

  // Pode lançar (prosa/cercas) ou retornar algo fora do contrato. Tudo bem:
  // é exatamente o que acontece quando não há estrutura ao redor do modelo.
  return JSON.parse(textOf(message));
}

// Permite rodar isolado: `npm run without`
if (import.meta.url === `file://${process.argv[1]}`) {
  extractWithoutHarness()
    .then((v) => console.log("Resultado cru:\n", JSON.stringify(v, null, 2)))
    .catch((e) => console.error("Estourou sem harness:", (e as Error).message));
}
