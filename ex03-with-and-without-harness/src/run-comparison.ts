import { extractWithoutHarness } from "./without-harness";
import { extractWithHarness } from "./with-harness";
import { LeadSchema } from "./schema";
import { MODEL, c, bar, heading, rule } from "@harness/client";

// ─────────────────────────────────────────────────────────────────────────────
// ex03 — With and Without Harness
//
// Conceito (6): Confiabilidade = Capacidade × Estrutura de Harness. O mesmo
// problema, resolvido com e sem harness, mostra uma diferença gritante de taxa
// de sucesso. A capacidade do modelo é a mesma nos dois lados — o que muda é a
// estrutura ao redor.
//
// Este arquivo é o ORQUESTRADOR (o `npm start`). A lógica de cada lado mora em
// arquivos separados, para a comparação ficar honesta:
//   • schema.ts          — o contrato (zod), o texto e o prompt base ÚNICO.
//   • without-harness.ts — a chamada nua: pede, faz JSON.parse, entrega.
//   • with-harness.ts    — a mesma chamada + strip + zod + retry + fallback.
//
// O QUE ESTE SCRIPT FAZ, PASSO A PASSO:
//   1. Roda o lado SEM harness N vezes; conta quantas saídas, por sorte, batem o
//      contrato (validando com o MESMO schema, só para ter uma régua).
//   2. Roda o lado COM harness N vezes; cada execução tenta validar, faz retry
//      devolvendo o erro ao modelo e, no pior caso, cai num fallback válido.
//   3. Imprime as taxas de sucesso lado a lado.
//   4. Conclui: o modelo é o mesmo; a confiabilidade vem da estrutura ao redor.
// ─────────────────────────────────────────────────────────────────────────────

const N = 5; // quantas vezes rodamos cada lado, para comparar taxas de sucesso

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
  heading("ex03 · With and Without Harness", `modelo: ${MODEL} · ${N} execuções de cada lado`);
  console.log(
    `\nMesma chamada base e mesmo ${c.bold("texto ambíguo de lead")} nos dois lados — ` +
      `só muda a estrutura ao redor.\nO prompt completo aparece no ${c.dim("[debug]")}.`,
  );

  // ── SEM harness ─────────────────────────────────────────────────────────────
  console.log(rule("SEM HARNESS · chamada nua + JSON.parse"));
  const without = await Promise.all(Array.from({ length: N }, () => gradeWithout()));
  without.forEach((r, i) =>
    console.log(
      `  run ${i + 1}: ${r.ok ? c.green("✔ OK".padEnd(7)) : c.red("✘ FALHA".padEnd(7))}  — ${c.dim(r.detail)}`,
    ),
  );
  const withoutOk = without.filter((r) => r.ok).length;

  // ── COM harness ─────────────────────────────────────────────────────────────
  console.log(rule("COM HARNESS · saída estruturada + zod + retry + fallback"));
  const withH = await Promise.all(Array.from({ length: N }, () => extractWithHarness()));
  withH.forEach((r, i) => {
    const status = r.usedFallback
      ? c.yellow("▒ FALLBACK (degradado, mas válido)")
      : c.green(`✔ OK em ${r.attempts} tentativa(s)`);
    console.log(`  run ${i + 1}: ${status}`);
  });
  const withValidated = withH.filter((r) => !r.usedFallback).length;
  const withUsable = withH.length; // o harness SEMPRE entrega algo conforme o schema

  // ── Placar ──────────────────────────────────────────────────────────────────
  console.log(rule("TAXA DE SUCESSO"));
  const pct = (n: number) => `${((n / N) * 100).toFixed(0)}%`;
  const placar = (label: string, n: number) =>
    console.log(`  ${label.padEnd(48)} ${bar(n / N)} ${c.bold(`${n}/${N}`)} ${c.dim(`(${pct(n)})`)}`);
  placar("SEM harness · conforme o contrato", withoutOk);
  placar("COM harness · validado sem fallback", withValidated);
  placar("COM harness · conforme o schema (incl. fallback)", withUsable);

  console.log(rule("LEITURA"));
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
