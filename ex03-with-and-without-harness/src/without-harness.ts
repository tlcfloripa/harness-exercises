import { client, MODEL, textOf, debugApiCall } from "@harness/client";
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

  const raw = textOf(message);
  debugApiCall({ messages: [{ role: "user", content: BASE_PROMPT }] }, raw, "sem harness");

  // Pode lançar (prosa/cercas) ou retornar algo fora do contrato. Tudo bem:
  // é exatamente o que acontece quando não há estrutura ao redor do modelo.
  return JSON.parse(raw);
}

// Permite rodar isolado: `npm run without`
// O conteúdo cru sai no [debug] da chamada; aqui só sinalizamos se parseou ou
// estourou — a fragilidade (estourar) é o ponto, não o dump do resultado.
if (import.meta.url === `file://${process.argv[1]}`) {
  extractWithoutHarness()
    .then(() => console.log("Parseou sem estourar (conteúdo cru no [debug] acima)."))
    .catch((e) => console.error("Estourou sem harness:", (e as Error).message));
}
