import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// SENSORS — a camada de FEEDBACK. Rodam DEPOIS da resposta. Detectam o erro.
// Não previnem nada; observam o que saiu e levantam a mão quando algo está
// errado (conceito 9: monitoramento, validação, observabilidade).
// ─────────────────────────────────────────────────────────────────────────────

export const TicketSchema = z.object({
  categoria: z.enum(["bug", "duvida", "financeiro", "outro"]),
  prioridade: z.enum(["baixa", "media", "alta"]),
  resumo: z.string().max(140),
});
export type Ticket = z.infer<typeof TicketSchema>;

export interface SensorResult {
  nome: string;
  ok: boolean;
  detalhe: string;
}

function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

function tryParse(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(stripFences(raw));
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

/** Sensor 1 — validação de schema (tipos + enums + tamanho). */
function sensorSchema(raw: string): SensorResult {
  const parsed = tryParse(raw);
  if (!parsed) return { nome: "schema", ok: false, detalhe: "resposta não é JSON parseável" };
  const result = TicketSchema.safeParse(parsed);
  return result.success
    ? { nome: "schema", ok: true, detalhe: "conforma o contrato" }
    : {
        nome: "schema",
        ok: false,
        detalhe: result.error.issues
          .map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`)
          .join("; "),
      };
}

/** Sensor 2 — presença de campos obrigatórios (independente do schema). */
function sensorCamposObrigatorios(raw: string): SensorResult {
  const parsed = tryParse(raw);
  if (!parsed) return { nome: "campos", ok: false, detalhe: "sem objeto para checar" };
  const faltando = ["categoria", "prioridade", "resumo"].filter(
    (k) => parsed[k] === undefined || parsed[k] === null || parsed[k] === "",
  );
  return faltando.length === 0
    ? { nome: "campos", ok: true, detalhe: "todos os campos obrigatórios presentes" }
    : { nome: "campos", ok: false, detalhe: `faltando: ${faltando.join(", ")}` };
}

/** Sensor 3 — detecção simples de alucinação: números no resumo ausentes da fonte. */
function sensorAlucinacao(raw: string, fonte: string): SensorResult {
  const parsed = tryParse(raw);
  const resumo = typeof parsed?.resumo === "string" ? parsed.resumo : "";
  if (!resumo) return { nome: "alucinacao", ok: true, detalhe: "sem resumo para auditar" };

  const numerosResumo = resumo.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const fonteNormalizada = fonte.replace(/\s+/g, "");
  const inventados = numerosResumo.filter((n) => !fonteNormalizada.includes(n));

  return inventados.length === 0
    ? { nome: "alucinacao", ok: true, detalhe: "nenhum número inventado no resumo" }
    : {
        nome: "alucinacao",
        ok: false,
        detalhe: `números no resumo que não estão na mensagem: ${inventados.join(", ")}`,
      };
}

/** Roda todos os sensores sobre a resposta crua. */
export function runSensors(raw: string, fonte: string): SensorResult[] {
  return [sensorSchema(raw), sensorCamposObrigatorios(raw), sensorAlucinacao(raw, fonte)];
}
