import dotenv from "dotenv";
// Carrega a chave do .env da raiz (rodando de dentro da pasta do exercício)
// ou do diretório atual (rodando via workspace a partir da raiz).
dotenv.config({ path: [".env", "../.env"], quiet: true });

import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

// Dois modos de autenticação suportados:
//  • API key da Console (sk-ant-api...)  → header x-api-key
//  • OAuth token (sk-ant-oat..., ex.: gerado via `ant auth login` / Claude Code)
//    → header Authorization: Bearer + anthropic-beta: oauth-2025-04-20
// O token OAuth pode estar em ANTHROPIC_AUTH_TOKEN ou, por engano, em
// ANTHROPIC_API_KEY (detectamos pelo prefixo sk-ant-oat).
const explicitAuthToken = process.env.ANTHROPIC_AUTH_TOKEN;
const apiKeyVar = process.env.ANTHROPIC_API_KEY;
const oauthNaApiKey = !explicitAuthToken && !!apiKeyVar && apiKeyVar.startsWith("sk-ant-oat");

const authToken = explicitAuthToken ?? (oauthNaApiKey ? apiKeyVar : undefined);
const apiKey = authToken ? undefined : apiKeyVar;

if (!authToken && !apiKey) {
  console.error(
    "\n⚠️  Credencial não encontrada.\n" +
      "   Copie .env.example para .env na raiz e preencha ANTHROPIC_API_KEY\n" +
      "   (Console) ou ANTHROPIC_AUTH_TOKEN (OAuth).\n",
  );
  process.exit(1);
}

// Evita o SDK enviar x-api-key junto com o Bearer (mandar os dois → 401).
if (authToken) delete process.env.ANTHROPIC_API_KEY;

// maxRetries cobre 429/5xx no nível de TRANSPORTE (com backoff + Retry-After).
// Isso NÃO é retry de output do modelo — os exercícios crus (ex01/ex02) seguem
// crus; é só resiliência a limite de taxa, útil para tokens OAuth de assinatura.
const commonOptions = { maxRetries: 6 };

export const client = authToken
  ? new Anthropic({
      ...commonOptions,
      authToken,
      defaultHeaders: { "anthropic-beta": "oauth-2025-04-20" },
    })
  : new Anthropic({ ...commonOptions, apiKey });

/** Concatena os blocos de texto de uma resposta da Messages API. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// ── Estilo de terminal (ANSI) — helpers de UI compartilhados ──────────────────
// Puramente cosmético: deixa a saída dos exercícios legível no terminal. NÃO toca
// no comportamento do modelo nem do harness. Vive aqui (e não em cada pasta) para
// não duplicar — todos os exercícios importam de @harness/client.
const sgr = (codigo: string) => (s: string | number) => `\x1b[${codigo}m${s}\x1b[0m`;

export const c = {
  bold: sgr("1"),
  dim: sgr("2"),
  italic: sgr("3"),
  red: sgr("38;5;203"),
  green: sgr("38;5;42"),
  yellow: sgr("38;5;221"),
  blue: sgr("38;5;75"),
  cyan: sgr("38;5;80"),
  magenta: sgr("38;5;176"),
  gray: sgr("38;5;245"),
};

/** Barra de progresso colorida por nível (verde alto / amarelo médio / vermelho baixo). */
export function bar(ratio: number, width = 22): string {
  const r = Math.max(0, Math.min(1, ratio));
  const cheio = Math.round(r * width);
  const tinta = r >= 0.66 ? c.green : r >= 0.33 ? c.yellow : c.red;
  return tinta("█".repeat(cheio)) + c.dim("░".repeat(width - cheio));
}

/** Cabeçalho do exercício: título em destaque + subtítulo opcional. */
export function heading(title: string, subtitle?: string): void {
  const linha = "━".repeat(78);
  console.log(c.cyan(linha));
  console.log(c.bold(c.cyan(`  ${title}`)));
  if (subtitle) console.log(`  ${c.dim(subtitle)}`);
  console.log(c.cyan(linha));
}

/** Divisor de seção: rótulo em negrito + régua. Retorna string (use com console.log). */
export function rule(label = ""): string {
  const linha = c.dim("─".repeat(78));
  return label ? `\n${c.bold(label)}\n${linha}` : linha;
}

// ── Debug: loga a REQUISIÇÃO e a RESPOSTA crua de cada chamada à API ──────────
// Em cinza (aspecto "disabled"), para não competir com a saída principal do
// exercício, mas com títulos em negrito e uma linha em branco antes de cada bloco
// para ficar fácil de ler. É só instrumentação para inspecionar o que foi enviado
// e o que a API devolveu — NÃO valida, NÃO corrige e NÃO altera o comportamento.
const DIM_GRAY = "\x1b[38;5;245m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

interface DebugRequest {
  system?: string;
  messages: ReadonlyArray<{ role: string; content: unknown }>;
}

export function debugApiCall(req: DebugRequest, raw: string, contexto?: string): void {
  const rotulo = contexto ? ` · ${contexto}` : "";
  // Linha de conteúdo (cinza), título de seção (cinza + negrito) e rótulo de papel.
  const linha = (s = "") => console.log(`${DIM_GRAY}  │ ${s}${RESET}`);
  const titulo = (borda: string, s: string) =>
    console.log(`${BOLD}${DIM_GRAY}  ${borda} ${s}${RESET}`);
  const papel = (s: string) => `${BOLD}${s}${RESET}${DIM_GRAY}`;

  console.log(""); // espaço entre debugs

  titulo("┌─", `[debug] chamada à API${rotulo}`);

  titulo("├─", "requisição");
  if (req.system) {
    linha(papel("[system]"));
    for (const l of req.system.split("\n")) linha(l);
  }
  for (const m of req.messages) {
    const content =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content, null, 2);
    linha(papel(`[${m.role}]`));
    for (const l of content.split("\n")) linha(l);
  }

  titulo("├─", "resposta");
  for (const l of (raw.trim() || "(resposta vazia)").split("\n")) linha(l);

  console.log(`${BOLD}${DIM_GRAY}  └${"─".repeat(40)}${RESET}`);
}
