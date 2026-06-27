import { client, MODEL, textOf, debugApiCall, c, heading, rule } from "@harness/client";
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
//
// As duas camadas vivem em arquivos separados de propósito (a separação física é
// o ponto pedagógico):
//   • guides.ts  — feedforward: o que entra no system prompt ANTES da chamada.
//   • sensors.ts — feedback: as checagens que rodam DEPOIS da resposta.
//
// O QUE ESTE SCRIPT FAZ, PASSO A PASSO:
//   1. Pega uma mensagem de cliente (sem números/datas, para flagrar invenção).
//   2. Roda a mesma tarefa em TRÊS configurações:
//        a) sem guides, sem sensors  — o agente erra e ninguém percebe;
//        b) sem guides, com sensors  — erra, mas os sensores detectam;
//        c) com guides e com sensors — previne o erro E ainda verifica.
//   3. Para cada configuração, imprime o que cada camada fez (guides aplicados ou
//      não, resultado de cada sensor). A resposta crua do modelo não é
//      reimpressa: o [debug] do cliente já loga cada chamada.
//   4. Conclui: feedforward e feedback são complementares; a contenção real só
//      aparece com as duas juntas.
// ─────────────────────────────────────────────────────────────────────────────

// Mensagem propositalmente sem números/datas: se o modelo inventar um valor ou
// prazo, o sensor de alucinação levanta a mão.
const MENSAGEM_CLIENTE =
  "Oi, comprei o plano anual mas fui cobrado em duplicidade no cartão. Já tentei " +
  "resolver pelo app e não consegui. Preciso disso resolvido logo, está me " +
  "atrapalhando o trabalho.";

interface Config {
  label: string;
  useGuides: boolean;
  useSensors: boolean;
}

async function runConfig({ label, useGuides, useSensors }: Config) {
  console.log(rule(`CONFIG · ${label}`));

  // ── Camada 1: GUIDES (feedforward) ──────────────────────────────────────────
  const system = buildSystemPrompt(useGuides);
  console.log(
    `${c.bold(c.magenta("[Guides] "))} ${
      useGuides
        ? c.green("APLICADOS (instruções + conhecimento + restrições)")
        : c.dim("AUSENTES (orientação vaga)")
    }`,
  );

  // ── Camada 2: MODEL CALL ────────────────────────────────────────────────────
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: MENSAGEM_CLIENTE }],
  });
  const raw = textOf(response).trim();
  debugApiCall({ system, messages: [{ role: "user", content: MENSAGEM_CLIENTE }] }, raw, label);
  // A resposta crua não é reimpressa aqui: o [debug] acima já a loga (rotulada
  // por config). O exercício foca no que cada CAMADA fez — guides e sensors.
  console.log(`${c.bold(c.cyan("[Model] "))} ${c.dim("respondeu (conteúdo cru no [debug] acima)")}`);

  // ── Camada 3: SENSORS (feedback) ────────────────────────────────────────────
  if (!useSensors) {
    console.log(
      `${c.bold(c.yellow("[Sensors]"))} ${c.dim("AUSENTES — nenhuma checagem. O que saiu, saiu (e ninguém sabe se está certo).")}`,
    );
    return;
  }

  const resultados = runSensors(raw, MENSAGEM_CLIENTE);
  console.log(`${c.bold(c.blue("[Sensors]"))} rodando ${c.bold(String(resultados.length))} sensores pós-resposta:`);
  for (const s of resultados) {
    const marca = s.ok ? c.green("✔") : c.red("✘");
    console.log(`          ${marca} ${c.bold(s.nome.padEnd(11))} — ${c.dim(s.detalhe)}`);
  }
  const falhas = resultados.filter((s) => !s.ok);
  console.log(
    falhas.length === 0
      ? c.green("          → todos os sensores passaram. Output liberado.")
      : c.yellow(`          → ${falhas.length} sensor(es) acusaram problema. CONTIDO antes de virar dado ruim.`),
  );
}

async function main() {
  heading("ex05 · Feedforward & Feedback", `modelo: ${MODEL}`);
  console.log(
    `\nMesma ${c.bold("mensagem de cliente")} (sem números/datas) nas três configurações.\n` +
      `O prompt completo aparece no ${c.dim("[debug]")} de cada chamada.`,
  );

  // Três configurações para ver as camadas isoladas e juntas.
  await runConfig({ label: "sem guides · sem sensors", useGuides: false, useSensors: false });
  await runConfig({ label: "sem guides · COM sensors (detecta, mas não previne)", useGuides: false, useSensors: true });
  await runConfig({ label: "COM guides · COM sensors (previne E verifica)", useGuides: true, useSensors: true });

  console.log(rule("LEITURA"));
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
