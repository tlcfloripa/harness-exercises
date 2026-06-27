import { client, MODEL, textOf, debugApiCall, c, bar, heading, rule } from "@harness/client";

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
//
// O QUE ESTE SCRIPT FAZ, PASSO A PASSO:
//   1. Parte de uma única ideia-semente (SEED), idêntica para todas as cadeias.
//   2. Define uma cadeia de 3 passos onde o output de um passo é o input do próximo
//      (plano → decomposição em sub-tarefas → escolha do maior risco).
//   3. Roda essa MESMA cadeia 3 vezes em paralelo, sem nenhum gate entre os passos.
//   4. Em cada passo, mede a similaridade média entre as 3 cadeias (índice de
//      Jaccard sobre as palavras) — um número de 0% a 100%.
//   5. Mostra a similaridade caindo passo a passo: a variância se multiplica.
//   6. Conclui: autonomia encadeada sem contenção transforma diferenças mínimas
//      em trajetórias completamente distintas.
// ─────────────────────────────────────────────────────────────────────────────

const CHAINS = 3; // quantas vezes rodamos a cadeia inteira, para poder comparar
// temperature controla o quão "aleatório" é o sampling do modelo. 1.0 é alto:
// favorece a divergência, o que torna a cascata visível. ATENÇÃO: exige um modelo
// que aceite sampling (família 4.x Sonnet/Haiku); Opus 4.7/4.8 e Fable 5 dão HTTP 400.
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

async function callStep(prompt: string, label: string): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    temperature: TEMPERATURE, // exige modelo da família 4.x (Sonnet/Haiku)
    messages: [{ role: "user", content: prompt }],
  });
  const raw = textOf(message).trim();
  debugApiCall({ messages: [{ role: "user", content: prompt }] }, raw, label);
  return raw;
}

/** Roda a cadeia completa de 3 passos, sem gate, guardando o output de cada um. */
async function runChain(chainIndex: number): Promise<string[]> {
  const letra = String.fromCharCode(65 + chainIndex);
  const outputs: string[] = [];
  let entrada = "";
  for (const step of STEPS) {
    const out = await callStep(step.prompt(entrada), `cadeia ${letra} · ${step.nome}`);
    outputs.push(out);
    entrada = out; // o fork se propaga: este output vira o próximo prompt
  }
  return outputs;
}

// ── Métrica de divergência: similaridade entre cadeias por passo ──────────────
// Quebra um texto no conjunto de palavras distintas (minúsculas, sem pontuação,
// ignorando palavras com 2 letras ou menos). É a base para comparar dois textos.
function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\d]+/u)
      .filter((w) => w.length > 2),
  );
}

// Índice de Jaccard: mede o quanto dois textos "se parecem" em vocabulário.
// É (palavras em comum) / (total de palavras distintas). 1 = idênticos, 0 = nada
// em comum. Simples de propósito — não precisa ser semântico para a cascata aparecer.
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

function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

async function main() {
  heading(
    "ex02 · Variance Cascade",
    `modelo: ${MODEL} · temp ${TEMPERATURE} · ${CHAINS} execuções da mesma cadeia de ${STEPS.length} passos, sem gate`,
  );
  console.log(
    `\nMesma ideia-semente para todas as cadeias — variância baixa na largada, ` +
      `que ${c.bold("cresce")} a cada passo.\nPrompts completos no ${c.dim("[debug]")}.`,
  );

  const chains = await Promise.all(Array.from({ length: CHAINS }, (_, i) => runChain(i)));

  // Os textos de cada cadeia/passo não são reimpressos aqui: o [debug] do cliente
  // já loga cada chamada (rotulada por "cadeia X · passo N"). O exercício foca na
  // MÉTRICA — a similaridade entre as cadeias caindo passo a passo.
  const similaridades = STEPS.map((_, s) =>
    similaridadeMedia(chains.map((chain) => chain[s])),
  );

  // ── Análise da cascata ──────────────────────────────────────────────────────
  console.log(rule("ANÁLISE DA CASCATA"));
  console.log(c.dim("Similaridade média entre as cadeias, passo a passo:\n"));
  similaridades.forEach((sim, s) => {
    console.log(`  ${STEPS[s].nome.padEnd(24)} ${bar(sim)} ${c.bold(pct(sim))}`);
  });

  const caiu = similaridades[0] - similaridades[similaridades.length - 1];
  if (caiu > 0.02) {
    console.log(
      `\nA similaridade caiu ${c.bold(c.red(pct(caiu)))} do primeiro ao último passo. Mesmo partindo\n` +
        "de um ponto comum, cada passo autônomo recebe um input já um pouco diferente\n" +
        "do anterior — e a diferença NÃO se mantém: ela se multiplica. Nenhum passo\n" +
        "individual parece errado; a trajetória inteira é que diverge.\n",
    );
  } else {
    console.log(
      c.yellow("\nDessa vez a similaridade não caiu muito — raro com temp alta. Rode de novo;\n") +
        c.yellow("a cascata costuma aparecer.\n"),
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
