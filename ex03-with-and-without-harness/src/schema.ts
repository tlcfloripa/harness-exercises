import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// O contrato que o sistema EXIGE. É a régua única usada para medir sucesso —
// tanto no modo sem harness quanto no modo com harness.
// ─────────────────────────────────────────────────────────────────────────────
export const LeadSchema = z.object({
  company_size: z.enum(["small", "medium", "large"]),
  budget_brl: z.number(),
  // nullable de propósito: o período pode genuinamente não constar no texto, e o
  // harness não pode inventá-lo. Modelar `null` é parte de um contrato honesto.
  budget_period: z.enum(["monthly", "annual"]).nullable(),
  contact_email: z.string().includes("@"),
  decision_maker: z.boolean(),
});

export type Lead = z.infer<typeof LeadSchema>;

// Texto ambíguo de propósito: "porte médio" (≠ "medium"), "50 mil" (≠ número),
// período não informado, e a decisão "passa pelo chefe" (decision_maker = false).
export const TEXTO = `
Recebi um contato de uma pessoa interessada. Ela trabalha numa empresa de
logística de porte médio, mencionou um orçamento por volta de 50 mil (não disse
se mensal ou anual) e deixou o e-mail ana.souza@exemplo.com. A decisão final
passa pelo chefe dela.
`.trim();

// A MESMA chamada base é usada nos dois modos. A única diferença entre eles é a
// estrutura (harness) ao redor da chamada — não o prompt.
export const BASE_PROMPT =
  `Extraia as informações deste texto como um objeto com os campos: ` +
  `company_size (small/medium/large), budget_brl (número em reais), ` +
  `budget_period (monthly/annual, ou null se não informado), contact_email, ` +
  `decision_maker (true/false).` +
  `\n\n${TEXTO}`;

/** Remove cercas ```json ... ``` quando presentes. */
export function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

/** Resume os erros de validação do zod em uma linha legível. */
export function summarizeIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`)
    .join("; ");
}
