import { client, MODEL, textOf } from "@harness/client";
import { buildSystemPrompt } from "./guides";
import { runSensors } from "./sensors";

// ─────────────────────────────────────────────────────────────────────────────
// ex05 — Feedforward & Feedback
//
// Conceito (9): Guides previnem (feedforward, antes da ação). Sensors detectam
// (feedback, depois da ação). São camadas com responsabilidades opostas e
// complementares. Sem guides, o agente erra livremente. Sem sensors, você não
// sabe que ele errou.
//
// O pipeline orquestra:  Guides  →  Model Call  →  Sensors
// ─────────────────────────────────────────────────────────────────────────────

// Mensagem propositalmente sem números/datas: se o modelo inventar um valor ou
// prazo, o sensor de alucinação levanta a mão.
const MENSAGEM_CLIENTE =
  "Oi, comprei o plano anual mas fui cobrado em duplicidade no cartão. Já tentei " +
  "resolver pelo app e não consegui. Preciso disso resolvido logo, está me " +
  "atrapalhando o trabalho.";

function divider(label = ""): string {
  const line = "─".repeat(78);
  return label ? `\n${label}\n${line}` : line;
}

interface Config {
  label: string;
  useGuides: boolean;
  useSensors: boolean;
}

async function runConfig({ label, useGuides, useSensors }: Config) {
  console.log(divider(`CONFIG · ${label}`));

  // ── Camada 1: GUIDES (feedforward) ──────────────────────────────────────────
  const system = buildSystemPrompt(useGuides);
  console.log(`[Guides]  ${useGuides ? "APLICADOS (instruções + conhecimento + restrições)" : "AUSENTES (orientação vaga)"}`);

  // ── Camada 2: MODEL CALL ────────────────────────────────────────────────────
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: MENSAGEM_CLIENTE }],
  });
  const raw = textOf(response).trim();
  console.log(`[Model]   resposta crua:`);
  console.log(
    raw
      .split("\n")
      .map((l) => "          " + l)
      .join("\n"),
  );

  // ── Camada 3: SENSORS (feedback) ────────────────────────────────────────────
  if (!useSensors) {
    console.log(`[Sensors] AUSENTES — nenhuma checagem. O que saiu, saiu (e ninguém sabe se está certo).`);
    return;
  }

  const resultados = runSensors(raw, MENSAGEM_CLIENTE);
  console.log(`[Sensors] rodando ${resultados.length} sensores pós-resposta:`);
  for (const s of resultados) {
    console.log(`          ${s.ok ? "✔" : "✘"} ${s.nome.padEnd(11)} — ${s.detalhe}`);
  }
  const falhas = resultados.filter((s) => !s.ok);
  console.log(
    falhas.length === 0
      ? "          → todos os sensores passaram. Output liberado."
      : `          → ${falhas.length} sensor(es) acusaram problema. CONTIDO antes de virar dado ruim.`,
  );
}

async function main() {
  console.log("═".repeat(78));
  console.log(`ex05 · Feedforward & Feedback · modelo: ${MODEL}`);
  console.log("═".repeat(78));
  console.log("MENSAGEM DO CLIENTE:");
  console.log(MENSAGEM_CLIENTE);

  // Três configurações para ver as camadas isoladas e juntas.
  await runConfig({ label: "sem guides · sem sensors", useGuides: false, useSensors: false });
  await runConfig({ label: "sem guides · COM sensors (detecta, mas não previne)", useGuides: false, useSensors: true });
  await runConfig({ label: "COM guides · COM sensors (previne E verifica)", useGuides: true, useSensors: true });

  console.log(divider("LEITURA"));
  console.log(
    "Guides e sensors são camadas opostas e complementares. Guides (feedforward)\n" +
      "reduzem a chance do erro antes da ação. Sensors (feedback) flagram o erro\n" +
      "depois da ação. Sem guides, o agente erra livremente. Sem sensors, você não\n" +
      "fica sabendo. A contenção real vem das duas juntas.\n",
  );
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
