import { client, MODEL, textOf, debugApiCall, c, heading, rule } from "@harness/client";

// ─────────────────────────────────────────────────────────────────────────────
// ex01 — Diverging Responses
//
// Conceito (1) e (3): o mesmo prompt, rodado N vezes contra a API CRUA, produz
// respostas estruturalmente diferentes. Capacidade e variância vêm da mesma
// fonte. Aqui NÃO há schema enforcement, retry ou validação. É a API nua.
//
// O QUE ESTE SCRIPT FAZ, PASSO A PASSO:
//   1. Define um texto de entrada deliberadamente ambíguo (sem schema pedido).
//   2. Dispara o MESMO prompt N vezes em paralelo direto contra a API da Anthropic.
//   3. Para cada resposta, tenta extrair o JSON e lista as chaves que vieram.
//   4. Monta uma "matriz de presença de campos" (quais chaves apareceram em
//      cada resposta) e conta quantas ESTRUTURAS distintas surgiram.
//   5. Conclui: para o mesmo input, sem harness, o formato de saída é imprevisível.
//
// As respostas cruas de cada execução não são reimpressas aqui: o [debug] do
// cliente já loga requisição e resposta de cada chamada. Este script foca na
// MÉTRICA de divergência, que é a lógica do exercício.
//
// Por que sem harness? Porque o ponto pedagógico é VER a variância crua. Schema,
// retry e validação (o harness) só entram a partir do ex03.
// ─────────────────────────────────────────────────────────────────────────────

// Quantas vezes vamos repetir o mesmo prompt para comparar as respostas.
const N = 5;

// Texto deliberadamente ambíguo: nenhum schema foi especificado, então cada
// execução "decide" quais campos extrair e como nomeá-los.
const TEXTO_AMBIGUO = `
Recebi um contato de uma pessoa interessada no produto. Ela falou que trabalha
numa empresa de logística, acho que de porte médio, e mencionou um orçamento por
volta de 50 mil — mas não ficou claro se é mensal ou anual. Deixou um e-mail de
contato e disse que prefere conversar de manhã. Parecia bem animada com a parte
de automação, e comentou que a decisão final passa pelo chefe dela.
`.trim();

const PROMPT = `Extraia os dados estruturados deste texto em JSON.\n\n${TEXTO_AMBIGUO}`;

// Estrutura que guarda o resultado de UMA execução, para podermos comparar depois.
interface RunResult {
  index: number; // número da execução (1..N), só para rotular na saída
  raw: string; // o texto bruto que o modelo devolveu
  parsed: Record<string, unknown> | null; // o JSON já parseado, ou null se não deu
  keys: string[]; // as chaves do JSON — é o que usamos para medir divergência
}

function stripFences(text: string): string {
  // O modelo às vezes embrulha o JSON em ```json ... ```. Removemos só para
  // CONSEGUIR medir a divergência — não é validação nem correção de output.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

// Faz UMA chamada à API e empacota o resultado num RunResult.
async function runOnce(index: number): Promise<RunResult> {
  // client.messages.create é a chamada crua à API da Anthropic. Não há nenhuma
  // camada nossa entre o prompt e a resposta — é exatamente esse "nada" que o
  // exercício quer expor.
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: PROMPT }],
  });

  // textOf() é um helper que só extrai o texto da resposta (a API devolve um
  // objeto com blocos de conteúdo). Aqui pegamos o texto cru, sem tratar nada.
  const raw = textOf(message);
  debugApiCall({ messages: [{ role: "user", content: PROMPT }] }, raw, `execução #${index}`);
  let parsed: Record<string, unknown> | null = null;
  try {
    const value = JSON.parse(stripFences(raw));
    parsed = value && typeof value === "object" ? value : null;
  } catch {
    parsed = null; // resposta não-parseável também É um sinal de divergência
  }

  return { index, raw, parsed, keys: parsed ? Object.keys(parsed) : [] };
}

async function main() {
  heading("ex01 · Diverging Responses", `modelo: ${MODEL} · ${N} execuções em paralelo · API crua`);
  console.log(
    `\nEnviando o mesmo prompt de extração sobre um ${c.bold("texto ambíguo de lead")} ` +
      `(sem schema pedido).\nO prompt completo aparece no ${c.dim("[debug]")} de cada execução.`,
  );

  const results = await Promise.all(
    Array.from({ length: N }, (_, i) => runOnce(i + 1)),
  );

  // ── Métrica de divergência ─────────────────────────────────────────────────
  // Une todas as chaves vistas em qualquer resposta (sem repetir) e ordena.
  const allKeys = Array.from(new Set(results.flatMap((r) => r.keys))).sort();
  // Cada resposta vira uma "assinatura" = seu conjunto ordenado de chaves. Quantas
  // assinaturas distintas existem = quantos formatos diferentes o modelo produziu
  // para o MESMO input. Usar um Set elimina duplicatas automaticamente.
  const structures = new Set(
    results.map((r) => (r.parsed ? JSON.stringify(r.keys.slice().sort()) : "ERRO")),
  );

  console.log(rule("MATRIZ DE PRESENÇA DE CAMPOS"));
  const header = ["campo".padEnd(22), ...results.map((r) => `#${r.index}`)].join(" ");
  console.log(c.bold(header));
  console.log(c.dim("─".repeat(header.length)));
  for (const key of allKeys) {
    const row = [
      c.cyan(key.padEnd(22)),
      ...results.map((r) => (r.keys.includes(key) ? c.green(" ✔") : c.dim(" ·"))),
    ].join(" ");
    console.log(row);
  }

  console.log(rule("DIVERGÊNCIA"));
  console.log(`Campos distintos vistos no total : ${c.bold(String(allKeys.length))}`);
  console.log(
    `Estruturas (conjuntos de chaves) distintas entre as ${N} respostas : ` +
      `${c.bold(c.yellow(String(structures.size)))}`,
  );
  const failures = results.filter((r) => !r.parsed).length;
  if (failures > 0) console.log(`Respostas não-parseáveis : ${c.red(`${failures}/${N}`)}`);
  console.log(
    structures.size === 1 && failures === 0
      ? c.green("\nDessa vez convergiu. Rode de novo — a variância é termodinâmica, não some.\n")
      : `\n${c.bold(c.yellow(String(structures.size) + " formatos diferentes"))} para o MESMO input. ` +
          "Sem harness,\nvocê não sabe qual deles vai chegar no seu banco de dados.\n",
  );
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
