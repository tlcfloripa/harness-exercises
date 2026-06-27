import { client, MODEL, textOf, debugApiCall } from "@harness/client";

// ─────────────────────────────────────────────────────────────────────────────
// ex06 — Aggressive Harness
//
// Conceito (12): A Lição Amarga / o preço arquitetural. Harness em excesso
// bloqueia a capacidade nativa do modelo. Restrição demais é TAMBÉM uma falha
// arquitetural — ela vira gargalo. Aqui o mesmo agente de sumarização roda em
// dois modos sobre o MESMO texto: restrito (regras rígidas demais) e calibrado
// (só o essencial).
//
// O QUE ESTE SCRIPT FAZ, PASSO A PASSO:
//   1. Usa um texto de entrada cheio de nuance (trade-offs, ressalvas, uma
//      recomendação condicional).
//   2. Define dois system prompts: um RESTRITO (16 regras rígidas) e um CALIBRADO
//      (só o essencial). O texto e o modelo são os mesmos nos dois.
//   3. Sumariza o texto com cada um dos dois prompts.
//   4. Conta, em cada resumo, quantos "marcadores de nuance" sobreviveram
//      (palavras como "mas", "porém", "trade-off", "renegociar"...).
//   5. Mostra os dois resumos lado a lado e lista o que o modo restrito sacrificou.
//   6. Conclui: harness mal calibrado (rígido demais) destrói a informação que
//      mais importa — é tão problemático quanto não ter harness nenhum.
// ─────────────────────────────────────────────────────────────────────────────

// Texto com nuance de propósito: tem trade-offs, ressalvas e uma recomendação
// condicional. É exatamente o tipo de informação que o harness agressivo destrói.
const TEXTO = `
A migração para o novo serviço de pagamentos reduziu a latência média em
situações normais, mas introduziu picos ocasionais sob carga alta que ainda não
entendemos. O custo caiu no curto prazo, embora o contrato de suporte premium
possa encarecer tudo a partir do próximo ano. O time entregou no prazo, porém às
custas de dívida técnica que vai precisar ser paga. No geral foi um avanço —
desde que a gente monitore os picos e renegocie o suporte a tempo.
`.trim();

// Harness AGRESSIVO: 16 regras rígidas, formato obrigatório, limite fixo,
// palavras proibidas, lista fechada de tópicos. Construído para um modelo fraco;
// vira camisa de força para um modelo capaz.
const SYSTEM_RESTRITO = `Você é um sumarizador corporativo. Siga TODAS as regras, sem exceção:
1. Use no MÁXIMO 30 palavras no total.
2. Produza EXATAMENTE 3 bullets.
3. Cada bullet deve começar com um verbo no imperativo.
4. PROIBIDO usar as palavras: "mas", "porém", "contudo", "embora", "talvez", "depende", "risco", "trade-off".
5. NÃO use adjetivos.
6. Aborde APENAS os tópicos desta lista fechada: desempenho, custo, prazo. Ignore qualquer outro tema.
7. NÃO use números.
8. NÃO use a palavra "time" nem "equipe".
9. Cada bullet com no máximo 8 palavras.
10. NÃO use vírgulas.
11. Tom estritamente neutro. NENHUMA recomendação.
12. NÃO mencione pessoas.
13. NÃO use conjunções.
14. PROIBIDO incluir ressalvas ou condições.
15. Formato obrigatório EXATO:
RESUMO:
- ...
- ...
- ...
16. Sob nenhuma circunstância ultrapasse os 3 bullets.`;

// Harness CALIBRADO: só as restrições essenciais ao contexto.
const SYSTEM_CALIBRADO = `Você é um sumarizador. Resuma o texto em até 4 bullets, claros e úteis.
Preserve as ressalvas e os trade-offs importantes — eles são o que mais importa para quem vai decidir.`;

async function summarize(system: string, label: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: `Resuma:\n\n${TEXTO}` }],
  });
  const raw = textOf(response).trim();
  debugApiCall(
    { system, messages: [{ role: "user", content: `Resuma:\n\n${TEXTO}` }] },
    raw,
    label,
  );
  return raw;
}

// Marcadores que precisam casar como PALAVRA INTEIRA — senão "mas" casaria
// dentro de "problemas", "sistemas", "demais" e inflaria o nuance do restrito.
const NUANCE_PALAVRA = ["mas", "porém", "porem", "embora", "contudo", "talvez"];
// Marcadores que podem casar por radical/substring (não dão falso positivo).
const NUANCE_RADICAL = [
  "trade-off",
  "tradeoff",
  "desde que",
  "monitor",
  "renegoci",
  "dívida",
  "divida",
  "ressalva",
];

function nuanceHits(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens = new Set(lower.split(/[^\p{L}]+/u).filter(Boolean));
  const hits: string[] = [];
  for (const m of NUANCE_PALAVRA) if (tokens.has(m)) hits.push(m);
  for (const m of NUANCE_RADICAL) if (lower.includes(m)) hits.push(m);
  return hits;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function divider(label = ""): string {
  const line = "═".repeat(78);
  return label ? `\n${label}\n${line}` : line;
}

async function main() {
  console.log(divider(`ex06 · Aggressive Harness · modelo: ${MODEL}`));
  console.log("Mesmo texto, mesmo modelo, dois harnesses de sumarização.\n");
  console.log("TEXTO DE ENTRADA (cheio de nuance):");
  console.log(TEXTO);

  const [restrito, calibrado] = await Promise.all([
    summarize(SYSTEM_RESTRITO, "restrito"),
    summarize(SYSTEM_CALIBRADO, "calibrado"),
  ]);

  console.log(divider("MODO RESTRITO · 16 regras rígidas"));
  console.log(restrito);
  console.log(`\n  palavras: ${wordCount(restrito)} · marcadores de nuance preservados: ${nuanceHits(restrito).length}`);

  console.log(divider("MODO CALIBRADO · só o essencial"));
  console.log(calibrado);
  console.log(`\n  palavras: ${wordCount(calibrado)} · marcadores de nuance preservados: ${nuanceHits(calibrado).length}`);

  // ── O que foi sacrificado ───────────────────────────────────────────────────
  const noCalibrado = nuanceHits(calibrado);
  const noRestrito = nuanceHits(restrito);
  const sacrificado = noCalibrado.filter((m) => !noRestrito.includes(m));

  console.log(divider("O QUE O HARNESS AGRESSIVO SACRIFICOU"));
  console.log(
    "O texto original carrega trade-offs (picos sob carga, suporte que encarece,\n" +
      "dívida técnica) e uma recomendação condicional (monitorar + renegociar).\n",
  );
  if (sacrificado.length > 0) {
    console.log(`Marcadores de nuance presentes no calibrado e PERDIDOS no restrito: ${sacrificado.join(", ")}`);
  }
  console.log(
    "\nO modo restrito produz algo mecânico, truncado e neutro demais: as 16 regras\n" +
      "proíbem exatamente as palavras (\"mas\", \"porém\", \"embora\") e estruturas\n" +
      "(ressalvas, recomendação) que carregam a informação que importa. A lista\n" +
      "fechada de tópicos descarta a dívida técnica. O limite de palavras achata o\n" +
      "resto.",
  );
  console.log(
    "\nEsse harness foi desenhado para um modelo fraco que precisava de rédea curta.\n" +
      "Aplicado a um modelo capaz, ele NÃO protege — ele bloqueia a capacidade nativa.\n" +
      "Restrição demais também é uma falha arquitetural: é o andaime velho barrando\n" +
      "as novas APIs do modelo. Calibre o harness ao modelo, não ao medo.\n",
  );
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
