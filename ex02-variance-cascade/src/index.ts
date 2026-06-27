import { client, MODEL, textOf } from "@harness/client";

// ─────────────────────────────────────────────────────────────────────────────
// ex02 — Variance Cascade
//
// Conceito (4): onde a variância se multiplica é na AUTONOMIA. Cada passo
// autônomo, cujo output alimenta o próximo prompt, abre um fork. Sem nenhum gate
// entre os passos, três execuções da MESMA cadeia divergem em árvore — e nenhum
// passo individual parece errado.
//
// Para que a MULTIPLICAÇÃO fique visível (e não só afirmada), as três cadeias
// partem de uma MESMA ideia-semente fixa. Assim o passo 1 começa com variância
// baixa (alta similaridade entre as cadeias) e a divergência CRESCE a cada passo.
// temperature alta (1.0) para tornar o efeito visível.
// ─────────────────────────────────────────────────────────────────────────────

const CHAINS = 3;
const TEMPERATURE = 1.0;

// Âncora comum a todas as cadeias: a variância nasce baixa porque o ponto de
// partida é idêntico. O que diverge é a trajetória autônoma a partir daqui.
const SEED =
  "um app que detecta quando a pessoa está cansada e sugere o momento de fazer uma pausa";

// Cada passo recebe o output do passo anterior. Não há contenção entre eles.
const STEPS: { nome: string; prompt: (entrada: string) => string }[] = [
  {
    nome: "passo 1 · plano",
    prompt: () =>
      `A partir da ideia a seguir, descreva em no máximo 2 frases COMO você ` +
      `implementaria a primeira versão (sem preâmbulo).\n\nIdeia: ${SEED}`,
  },
  {
    nome: "passo 2 · decomposição",
    prompt: (plano) =>
      `Liste exatamente 3 sub-tarefas técnicas para implementar o que está ` +
      `descrito abaixo (uma por linha, sem preâmbulo).\n\n${plano}`,
  },
  {
    nome: "passo 3 · risco",
    prompt: (subtarefas) =>
      `Das sub-tarefas abaixo, escolha a MAIS arriscada e descreva o principal ` +
      `risco em uma frase (sem preâmbulo).\n\nSub-tarefas:\n${subtarefas}`,
  },
];

async function callStep(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    temperature: TEMPERATURE, // exige modelo da família 4.x (Sonnet/Haiku)
    messages: [{ role: "user", content: prompt }],
  });
  return textOf(message).trim();
}

/** Roda a cadeia completa de 3 passos, sem gate, guardando o output de cada um. */
async function runChain(): Promise<string[]> {
  const outputs: string[] = [];
  let entrada = "";
  for (const step of STEPS) {
    const out = await callStep(step.prompt(entrada));
    outputs.push(out);
    entrada = out; // o fork se propaga: este output vira o próximo prompt
  }
  return outputs;
}

// ── Métrica de divergência: similaridade entre cadeias por passo ──────────────
function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\d]+/u)
      .filter((w) => w.length > 2),
  );
}

function jaccard(a: string, b: string): number {
  const A = wordSet(a);
  const B = wordSet(b);
  if (A.size === 0 && B.size === 0) return 1;
  const intersecao = [...A].filter((x) => B.has(x)).length;
  const uniao = new Set([...A, ...B]).size;
  return uniao === 0 ? 1 : intersecao / uniao;
}

/** Similaridade média entre todos os pares de cadeias num dado passo. */
function similaridadeMedia(textos: string[]): number {
  let soma = 0;
  let pares = 0;
  for (let i = 0; i < textos.length; i++) {
    for (let j = i + 1; j < textos.length; j++) {
      soma += jaccard(textos[i], textos[j]);
      pares++;
    }
  }
  return pares === 0 ? 1 : soma / pares;
}

function divider(label = ""): string {
  const line = "═".repeat(78);
  return label ? `\n${label}\n${line}` : line;
}

function oneLine(text: string, max = 70): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max - 1) + "…" : flat;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

async function main() {
  console.log(divider(`ex02 · Variance Cascade · modelo: ${MODEL} · temp ${TEMPERATURE}`));
  console.log(`${CHAINS} execuções da MESMA cadeia de ${STEPS.length} passos, sem gate entre passos.`);
  console.log(`Ponto de partida comum (variância baixa na largada): "${SEED}"\n`);

  const chains = await Promise.all(Array.from({ length: CHAINS }, () => runChain()));

  // ── Árvore de divergência: agrupada por passo ───────────────────────────────
  const similaridades: number[] = [];
  for (let s = 0; s < STEPS.length; s++) {
    console.log(divider(STEPS[s].nome.toUpperCase()));
    chains.forEach((chain, c) => {
      console.log(`  cadeia ${String.fromCharCode(65 + c)} ┃ ${oneLine(chain[s])}`);
    });
    const sim = similaridadeMedia(chains.map((chain) => chain[s]));
    similaridades.push(sim);
    console.log(`         → similaridade média entre as cadeias: ${pct(sim)}`);
  }

  // ── Análise da cascata ──────────────────────────────────────────────────────
  console.log(divider("ANÁLISE DA CASCATA"));
  console.log("Similaridade média entre as cadeias, passo a passo:");
  similaridades.forEach((sim, s) => {
    const barra = "█".repeat(Math.round(sim * 20)).padEnd(20, "░");
    console.log(`  ${STEPS[s].nome.padEnd(24)} ${barra} ${pct(sim)}`);
  });

  const caiu = similaridades[0] - similaridades[similaridades.length - 1];
  if (caiu > 0.02) {
    console.log(
      `\nA similaridade caiu ${pct(caiu)} do primeiro ao último passo. Mesmo partindo\n` +
        "de um ponto comum, cada passo autônomo recebe um input já um pouco diferente\n" +
        "do anterior — e a diferença NÃO se mantém: ela se multiplica. Nenhum passo\n" +
        "individual parece errado; a trajetória inteira é que diverge.\n",
    );
  } else {
    console.log(
      "\nDessa vez a similaridade não caiu muito — raro com temp alta. Rode de novo;\n" +
        "a cascata costuma aparecer.\n",
    );
  }
  console.log(
    "É por isso que autonomia sem contenção vira caos: cada chamada autônoma é um\n" +
      "fork de variância. O harness contém isso com gates, validação e limites.\n",
  );
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
