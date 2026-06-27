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

// ── Debug: loga a REQUISIÇÃO e a RESPOSTA crua de cada chamada à API ──────────
// Em cinza + dim (aspecto "disabled"), para não competir com a saída principal
// do exercício. É só instrumentação para inspecionar, a cada tentativa, o que
// foi enviado e o que a API devolveu — NÃO valida, NÃO corrige e NÃO altera o
// comportamento do modelo nem do harness ao redor.
const DIM_GRAY = "\x1b[38;5;245m";
const RESET = "\x1b[0m";

interface DebugRequest {
  system?: string;
  messages: ReadonlyArray<{ role: string; content: unknown }>;
}

export function debugApiCall(req: DebugRequest, raw: string, contexto?: string): void {
  const rotulo = contexto ? ` · ${contexto}` : "";
  const linhas: string[] = ["── requisição ──"];

  if (req.system) {
    linhas.push("[system]", ...req.system.split("\n"));
  }
  for (const m of req.messages) {
    const content =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content, null, 2);
    linhas.push(`[${m.role}]`, ...content.split("\n"));
  }

  linhas.push("── resposta ──", ...(raw.trim() || "(resposta vazia)").split("\n"));

  const corpo = linhas.map((l) => `${DIM_GRAY}  ┊ ${l}${RESET}`).join("\n");
  console.log(`${DIM_GRAY}  ┌ [debug] chamada à API${rotulo}${RESET}`);
  console.log(corpo);
}
