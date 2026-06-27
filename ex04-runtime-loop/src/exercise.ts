import Anthropic from "@anthropic-ai/sdk";
import { client, MODEL, textOf } from "@harness/client";

// ─────────────────────────────────────────────────────────────────────────────
// ex04 — Runtime Loop
//
// Conceitos (7) e (8): a Matriz de Responsabilidades e a Anatomia do Runtime.
// O harness NÃO pensa — ele LOOPA. Todo o "raciocínio" acontece dentro do Model
// Call. Tudo ao redor (Context Manager, Permission Gate, Tool Execution) é código
// determinístico, escrito à mão. Aqui o loop do agente é construído na unha para
// deixar essa separação explícita.
//
// O QUE ESTE SCRIPT FAZ, PASSO A PASSO (este É o loop do agente):
//   1. [Context Manager] mantém o histórico da conversa (um array de mensagens).
//   2. [Model Call] envia o histórico ao modelo — a ÚNICA etapa probabilística.
//   3. [Tool Use?] checa, por código, se a resposta é uma chamada de ferramenta
//      (um JSON com campo "tool") ou texto final.
//   4. [Permission Gate] se for ferramenta, confere contra uma allowlist HARDCODED;
//      o que não estiver nela é recusado.
//   5. [Tool Execution] executa a ferramenta permitida (busca no catálogo ou conta).
//   6. [Result] devolve o resultado ao histórico e volta ao passo 1.
//   O loop encerra quando o modelo responde texto puro, ou ao bater MAX_ITERATIONS.
//
// Repare que NENHUMA dessas etapas, exceto o Model Call, "pensa". Elas roteiam,
// checam e executam — é tudo código determinístico do engenheiro.
//
// Este exercício usa o SDK oficial só para os TIPOS das mensagens; o loop é nosso.
// ─────────────────────────────────────────────────────────────────────────────

// Trava de segurança: nunca deixamos o agente loopar para sempre. Conter a
// autonomia com um teto de iterações também é trabalho do harness.
const MAX_ITERATIONS = 6;

// ── Ferramentas (Tool Execution) — determinístico ───────────────────────────
const CATALOGO = [
  { nome: "Teclado mecânico", preco: 350 },
  { nome: "Mouse sem fio", preco: 120 },
  { nome: 'Monitor 27"', preco: 1800 },
  { nome: "Headset", preco: 400 },
  { nome: "Webcam HD", preco: 250 },
];

/**
 * Avaliador aritmético seguro (descida recursiva): + - * / e parênteses.
 * Nada de `eval`/`new Function` — uma ferramenta de tool-use jamais deve
 * interpretar string como código. Aqui o input vem do modelo (não-confiável).
 */
function evalAritmetica(input: string): number {
  const s = input.replace(/\s+/g, "");
  let i = 0;
  const peek = () => s[i];

  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = s[i++];
      const r = parseFactor();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function parseFactor(): number {
    if (peek() === "(") {
      i++;
      const v = parseExpr();
      if (peek() !== ")") throw new Error("parêntese não fechado");
      i++;
      return v;
    }
    if (peek() === "-") {
      i++;
      return -parseFactor();
    }
    let num = "";
    while (i < s.length && /[\d.]/.test(s[i])) num += s[i++];
    if (!/^\d+(?:\.\d+)?$/.test(num)) throw new Error("número malformado");
    return parseFloat(num);
  }

  const result = parseExpr();
  if (i < s.length) throw new Error("entrada residual");
  if (!Number.isFinite(result)) throw new Error("resultado inválido");
  return result;
}

const FERRAMENTAS: Record<string, (args: Record<string, unknown>) => string> = {
  buscar_produto: (args) => {
    const query = String(args.query ?? "").toLowerCase();
    const hits = CATALOGO.filter((p) => p.nome.toLowerCase().includes(query));
    return JSON.stringify(hits);
  },
  calcular: (args) => {
    const expr = String(args.expressao ?? args.expression ?? "");
    try {
      return String(evalAritmetica(expr));
    } catch {
      return "ERRO: não foi possível calcular";
    }
  },
};

// Permission Gate: allowlist HARDCODED. Qualquer coisa fora disto é rejeitada.
const ALLOWLIST = new Set(["buscar_produto", "calcular"]);

const SYSTEM = `Você é um assistente de compras que opera dentro de um runtime com ferramentas.

Ferramentas disponíveis:
- buscar_produto(query): busca produtos no catálogo por nome. Ex: {"tool":"buscar_produto","args":{"query":"teclado"}}
- calcular(expressao): avalia uma expressão aritmética. Ex: {"tool":"calcular","args":{"expressao":"350*0.9"}}

Protocolo OBRIGATÓRIO:
- Para usar uma ferramenta, responda APENAS com um objeto JSON: {"tool":"<nome>","args":{...}}. Nada além do JSON.
- Quando tiver a resposta final para o usuário, responda em TEXTO PURO, sem JSON.
- Use uma ferramenta por vez.`;

interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

/**
 * Extrai um objeto JSON da resposta, mesmo que o modelo adicione preâmbulo
 * ("Vou buscar...\n\n{...}") ou cercas ```json. Roteamento robusto faz parte do
 * harness: o runtime tem que lidar com a forma real que o modelo devolve.
 */
function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start !== -1 && end > start ? text.slice(start, end + 1) : null;
}

/** Tool Use check: a resposta do modelo é uma chamada de ferramenta ou texto final? */
function parseToolCall(text: string): ToolCall | null {
  const candidate = extractJsonObject(text);
  if (!candidate) return null; // sem objeto JSON → texto final
  try {
    const value = JSON.parse(candidate);
    if (value && typeof value === "object" && typeof value.tool === "string") {
      return { tool: value.tool, args: value.args ?? {} };
    }
  } catch {
    /* objeto malformado → tratamos como texto final */
  }
  return null;
}

function box(line: string) {
  console.log(`┃ ${line}`);
}

async function main() {
  const tarefa =
    "Quanto custa, no total, comprar um teclado e um mouse do nosso catálogo? " +
    "Aplique 10% de desconto sobre a soma e me diga o valor final.";

  console.log("═".repeat(78));
  console.log(`ex04 · Runtime Loop · modelo: ${MODEL}`);
  console.log("═".repeat(78));
  console.log(`Tarefa: ${tarefa}`);
  console.log(`Allowlist de ferramentas: [${[...ALLOWLIST].join(", ")}]`);

  // Context Manager: a memória/estado da conversa. Determinístico.
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: tarefa }];

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    console.log("\n┏━ ITERAÇÃO " + i + " " + "━".repeat(60));

    // [Context Manager] monta o prompt a partir do histórico
    box(`[Context Manager] histórico com ${messages.length} mensagem(ns)`);

    // [Model Call] a única parte probabilística do loop
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM,
      messages,
    });
    const reply = textOf(response).trim();
    box(`[Model Call] resposta: ${reply.replace(/\s+/g, " ").slice(0, 64)}`);

    // O modelo "falou": guardamos no histórico (Context Manager)
    messages.push({ role: "assistant", content: reply });

    // [Tool Use?] roteamento determinístico
    const call = parseToolCall(reply);
    if (!call) {
      box("[Tool Use?] não — texto puro detectado. SAINDO DO LOOP.");
      console.log("┗" + "━".repeat(72));
      console.log("\n" + "─".repeat(78));
      console.log("RESPOSTA FINAL:\n" + reply);
      console.log("─".repeat(78));
      console.log(
        "\nRepare: o harness não decidiu nada de inteligente. Ele só checou se a\n" +
          "resposta era JSON, passou pelo gate, executou a ferramenta e devolveu o\n" +
          "resultado ao contexto. O raciocínio inteiro ficou dentro do Model Call.\n",
      );
      return;
    }
    box(`[Tool Use?] sim — ferramenta "${call.tool}" com args ${JSON.stringify(call.args)}`);

    // [Permission Gate] determinístico — allowlist hardcoded
    if (!ALLOWLIST.has(call.tool)) {
      const erro = `Ferramenta "${call.tool}" NÃO está na allowlist. Recusada pelo Permission Gate.`;
      box(`[Permission Gate] ✘ REJEITADA — ${erro}`);
      // Devolve um erro estruturado ao contexto e segue o loop
      messages.push({
        role: "user",
        content: `ERRO_DO_RUNTIME: ${erro} Ferramentas permitidas: ${[...ALLOWLIST].join(", ")}.`,
      });
      console.log("┗" + "━".repeat(72));
      continue;
    }
    box(`[Permission Gate] ✔ permitida`);

    // [Tool Execution] roda em "sandbox" (aqui, função pura local)
    const resultado = FERRAMENTAS[call.tool](call.args);
    box(`[Tool Execution] resultado: ${resultado.slice(0, 64)}`);

    // [Result] adiciona ao contexto e volta ao topo do loop
    messages.push({
      role: "user",
      content: `Resultado da ferramenta ${call.tool}: ${resultado}`,
    });
    console.log("┗" + "━".repeat(72));
  }

  console.log(`\n⚠️  Limite de ${MAX_ITERATIONS} iterações atingido sem resposta final.`);
  console.log("O limite de loops também é parte do harness: contém a autonomia.");
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
