import { client, MODEL, textOf } from "@harness/client";
import { BASE_PROMPT, LeadSchema, Lead, stripFences, summarizeIssues } from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// COM harness. A MESMA chamada base, agora cercada de estrutura determinística:
//   • saída estruturada    — extrai JSON mesmo de respostas com cercas/prosa
//   • validação de schema  — zod confere o contrato
//   • retry com backoff    — re-pergunta, devolvendo o erro de validação ao modelo
//   • fallback estruturado — se tudo falhar, entrega um objeto válido e marcado
// Nada disso é inteligência do modelo. É código do engenheiro ao redor do modelo.
// ─────────────────────────────────────────────────────────────────────────────

export interface HarnessResult {
  data: Lead;
  attempts: number;
  usedFallback: boolean;
}

// Fallback estruturado: sempre conforme o schema, explicitamente degradado.
const FALLBACK: Lead = {
  company_size: "medium",
  budget_brl: 0,
  budget_period: "monthly",
  contact_email: "desconhecido@fallback.invalid",
  decision_maker: false,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt: number) => 200 * 2 ** (attempt - 1) + Math.random() * 100;

export async function extractWithHarness(maxAttempts = 3): Promise<HarnessResult> {
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const content =
      attempt === 1
        ? BASE_PROMPT
        : `${BASE_PROMPT}\n\nA tentativa anterior falhou na validação: ${lastError}\n` +
          `Responda APENAS com JSON válido, sem cercas e sem texto extra. ` +
          `Use exatamente os valores permitidos nos enums (em inglês).`;

    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 512,
        messages: [{ role: "user", content }],
      });

      const parsed = JSON.parse(stripFences(textOf(message)));
      const result = LeadSchema.safeParse(parsed);

      if (result.success) {
        return { data: result.data, attempts: attempt, usedFallback: false };
      }
      lastError = summarizeIssues(result.error);
    } catch (e) {
      lastError = `JSON inválido: ${(e as Error).message}`;
    }

    if (attempt < maxAttempts) await sleep(backoff(attempt));
  }

  // Esgotou as tentativas: degrada de forma previsível em vez de explodir.
  return { data: FALLBACK, attempts: maxAttempts, usedFallback: true };
}

// Permite rodar isolado: `npm run with`
if (import.meta.url === `file://${process.argv[1]}`) {
  extractWithHarness()
    .then((r) =>
      console.log(
        `tentativas=${r.attempts} fallback=${r.usedFallback}\n`,
        JSON.stringify(r.data, null, 2),
      ),
    )
    .catch((e) => console.error("Erro inesperado:", (e as Error).message));
}
