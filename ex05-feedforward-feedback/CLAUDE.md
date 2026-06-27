# CLAUDE.md — ex05-feedforward-feedback

## Conceito

Conceito (9): **Guides previnem (feedforward, antes), Sensors detectam
(feedback, depois)**. São camadas com responsabilidades opostas e
complementares. Sem guides, o agente erra livremente. Sem sensors, você não sabe
que ele errou.

## O que este exercício faz

As duas camadas estão **fisicamente separadas** em arquivos distintos:

- `src/guides.ts` — feedforward. Exporta as constraints que entram no system
  prompt ANTES da chamada: Instruções (o que fazer), Conhecimento (few-shot),
  Restrições (o que não fazer). `buildSystemPrompt(useGuides)` monta o prompt
  completo ou uma orientação vaga.
- `src/sensors.ts` — feedback. Exporta hooks que rodam DEPOIS da resposta:
  validação de schema (zod), checagem de campos obrigatórios e detecção simples
  de alucinação (números no resumo ausentes da mensagem original).
- `src/pipeline.ts` — orquestra `Guides → Model Call → Sensors` e imprime o
  resultado de cada camada separadamente. É o `npm start`.

Roda três configurações: sem nada, só sensors, e guides+sensors — para ver as
camadas isoladas e juntas.

## Restrições arquiteturais (NÃO violar)

- **Mantenha guides e sensors em arquivos separados.** A separação física é o
  ponto pedagógico: feedforward e feedback são camadas distintas.
- Guides agem **antes** (no system prompt). Sensors agem **depois** (sobre a
  resposta crua). Não misture — não coloque validação dentro dos guides nem
  instruções dentro dos sensors.
- A configuração "sem guides · sem sensors" deve permanecer crua, para mostrar a
  falha passar despercebida.

## Modelo

`claude-sonnet-4-6` (default). Não usa `temperature`.
