# CLAUDE.md — ex04-runtime-loop

## Conceito

Conceitos (7) **Matriz de Responsabilidades** e (8) **Anatomia do Runtime: o
Loop do Agente**. O harness não pensa — ele loopa. Todo o raciocínio acontece
dentro do Model Call; o resto (Context Manager, Permission Gate, Tool Execution)
é código determinístico, escrito à mão.

## O que este exercício faz

Constrói o loop do agente na unha, com cada estágio da matriz explicitamente
nomeado no código e no output:

1. **Context Manager** — mantém o array de mensagens (estado) e monta o prompt.
2. **Model Call** — a única parte probabilística.
3. **Tool Use check** — `parseToolCall` decide se a resposta é uma chamada de
   ferramenta (JSON com campo `tool`) ou texto final.
4. **Permission Gate** — allowlist hardcoded; rejeita ferramentas fora dela com
   erro estruturado devolvido ao contexto.
5. **Tool Execution** — executa `buscar_produto` (busca em array) ou `calcular`
   (avaliador aritmético seguro).
6. **Result** — adiciona ao contexto e volta ao topo.

O loop termina com texto puro (sem tool call) ou ao atingir `MAX_ITERATIONS`.
Cada iteração imprime o estado completo.

## Restrições arquiteturais (NÃO violar)

- **Sem frameworks de agente.** O loop é construído à mão de propósito — é o que
  torna a estrutura visível.
- **A ferramenta `calcular` NÃO pode usar `eval`/`new Function`.** Use o
  avaliador de descida recursiva incluído. O input vem do modelo
  (não-confiável); interpretar string como código seria uma falha de segurança
  e um péssimo exemplo num material de ensino.
- O Permission Gate é determinístico e hardcoded. Não o transforme em algo que o
  modelo controla — o ponto é que segurança de ferramentas é trabalho do
  engenheiro.

## Modelo

`claude-sonnet-4-6` (default). Não usa `temperature`.
