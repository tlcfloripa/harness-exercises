// ─────────────────────────────────────────────────────────────────────────────
// GUIDES — a camada de FEEDFORWARD. Entram no system prompt ANTES da chamada.
// Previnem o erro. Três tipos (conceito 9):
//   • Instruções   — o que fazer
//   • Conhecimento — como fazer (few-shot)
//   • Restrições   — o que não fazer
// ─────────────────────────────────────────────────────────────────────────────

// Instruções: o que fazer.
export const INSTRUCOES =
  "Extraia um ticket de suporte da mensagem do cliente, com os campos " +
  "categoria, prioridade e resumo.";

// Conhecimento: como fazer (exemplo few-shot).
export const CONHECIMENTO = `Exemplo:
Mensagem: "O app trava toda vez que eu abro o relatório mensal."
Ticket: {"categoria":"bug","prioridade":"media","resumo":"App trava ao abrir o relatório mensal."}`;

// Restrições: o que NÃO fazer.
export const RESTRICOES = `Restrições:
- categoria deve ser exatamente um de: bug, duvida, financeiro, outro.
- prioridade deve ser exatamente um de: baixa, media, alta.
- resumo: no máximo 140 caracteres, factual.
- NÃO invente informações ausentes da mensagem (valores, prazos, datas, nomes).
- Responda APENAS com o objeto JSON, sem cercas e sem texto extra.`;

/**
 * Monta o system prompt. Sem guides, o modelo recebe só uma orientação vaga —
 * é o feedforward AUSENTE, e o erro fica livre para acontecer.
 */
export function buildSystemPrompt(useGuides: boolean): string {
  if (!useGuides) {
    return "Você analisa mensagens de clientes e gera tickets de suporte em JSON.";
  }
  return [INSTRUCOES, CONHECIMENTO, RESTRICOES].join("\n\n");
}
