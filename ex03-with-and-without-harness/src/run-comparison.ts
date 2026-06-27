import { extractWithoutHarness } from "./without-harness";
import { extractWithHarness } from "./with-harness";
import { LeadSchema, TEXTO } from "./schema";
import { MODEL } from "@harness/client";

// ─────────────────────────────────────────────────────────────────────────────
// ex03 — With and Without Harness
//
// Conceito (6): Confiabilidade = Capacidade × Estrutura de Harness. O mesmo
// problema, resolvido com e sem harness, mostra uma diferença gritante de taxa
// de sucesso. A capacidade do modelo é a mesma nos dois lados — o que muda é a
// estrutura ao redor.
// ─────────────────────────────────────────────────────────────────────────────

const N = 5;

function divider(label = ""): string {
  const line = "─".repeat(78);
  return label ? `\n${label}\n${line}` : line;
}

/** No modo sem harness, "sucesso" = o que voltou já bate o contrato, por sorte. */
async function gradeWithout(): Promise<{ ok: boolean; detail: string }> {
  try {
    const value = await extractWithoutHarness();
    const result = LeadSchema.safeParse(value);
    return result.success
      ? { ok: true, detail: "parseou e conforma o schema" }
      : { ok: false, detail: "parseou, mas FORA do contrato" };
  } catch (e) {
    return { ok: false, detail: `nem parseou (${(e as Error).message.slice(0, 40)}…)` };
  }
}

async function main() {
  console.log(divider(`ex03 · With and Without Harness · modelo: ${MODEL}`));
  console.log("Mesma chamada base, mesmo texto ambíguo, 5 execuções de cada lado.\n");
  console.log("TEXTO DE ENTRADA:");
  console.log(TEXTO);

  // ── SEM harness ─────────────────────────────────────────────────────────────
  console.log(divider("SEM HARNESS · chamada nua + JSON.parse"));
  const without = await Promise.all(Array.from({ length: N }, () => gradeWithout()));
  without.forEach((r, i) =>
    console.log(`  run ${i + 1}: ${r.ok ? "✔ OK   " : "✘ FALHA"}  — ${r.detail}`),
  );
  const withoutOk = without.filter((r) => r.ok).length;

  // ── COM harness ─────────────────────────────────────────────────────────────
  console.log(divider("COM HARNESS · saída estruturada + zod + retry + fallback"));
  const withH = await Promise.all(Array.from({ length: N }, () => extractWithHarness()));
  withH.forEach((r, i) => {
    const status = r.usedFallback
      ? "▒ FALLBACK (degradado, mas válido)"
      : `✔ OK em ${r.attempts} tentativa(s)`;
    console.log(`  run ${i + 1}: ${status}`);
  });
  const withValidated = withH.filter((r) => !r.usedFallback).length;
  const withUsable = withH.length; // o harness SEMPRE entrega algo conforme o schema

  // ── Placar ──────────────────────────────────────────────────────────────────
  console.log(divider("TAXA DE SUCESSO"));
  const pct = (n: number) => `${((n / N) * 100).toFixed(0)}%`;
  console.log(`SEM harness · output conforme o contrato : ${withoutOk}/${N}  (${pct(withoutOk)})`);
  console.log(`COM harness · validado sem fallback      : ${withValidated}/${N}  (${pct(withValidated)})`);
  console.log(`COM harness · output conforme o schema, incl. fallback degradado : ${withUsable}/${N}  (${pct(withUsable)})`);

  console.log(divider("LEITURA"));
  console.log(
    "A capacidade bruta do modelo é idêntica nos dois lados. O que muda é a\n" +
      "estrutura: retries devolvem o erro de validação ao modelo, o schema barra\n" +
      "o que está fora do contrato, e o fallback garante que nada estoura rio\n" +
      "abaixo. Confiabilidade não se compra com um modelo melhor — compra-se com\n" +
      "restrição em volta do mesmo modelo.\n",
  );
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
