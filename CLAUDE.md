# CLAUDE.md — harness-exercises

Material prático do workshop **"Harness Engineering: a arquitetura estrita para
sistemas de agentes inteligentes"**, apresentado no **TLC Core Floripa**.

## Propósito pedagógico

Cada exercício existe para criar uma **experiência visceral** de um conceito que
no slide parece óbvio mas na prática surpreende. O objetivo **não** é demonstrar
boas práticas de código, nem produzir software production-ready. É fazer o
fenômeno acontecer na frente da pessoa, no terminal.

Quando um exercício precisa expor o **comportamento cru** de um LLM (sem
harness), ele chama a Anthropic API diretamente via script TypeScript/Node —
nunca via Claude Code. O ponto é ver o modelo se comportar sem estrutura ao
redor.

## A tese central

> O harness é a estrutura externa ao modelo que converte capacidade bruta em
> execução confiável.

Engenheiros que trabalham com LLMs em produção cometem um erro recorrente:
tratam o sistema como um wrapper fino em volta do modelo. O workshop argumenta
que essa inversão é o problema arquitetural mais comum e mais caro. **O modelo é
apenas uma peça. O sistema é o harness.**

## Os 13 conceitos do workshop

1. **O paradoxo da demonstração local.** A demo funciona lindamente na primeira
   vez e quebra na segunda. O código não mudou. A variação não está na lógica,
   mas na inconsistência intrínseca do modelo ou do ambiente.

2. **Variância não é bug, é termodinâmica.** Assim como não existe motor sem
   calor dissipado, não existe LLM sem variância. O objetivo nunca é eliminar a
   variância (é impossível). É contê-la onde machuca e aproveitá-la onde ajuda.

3. **A natureza dupla da caixa preta.** Capacidade e Variância vêm da mesma
   fonte. O modelo produz qualidade, conhecimento e raciocínio, mas o threshold
   de usar uma ferramenta varia, a extração de campos ignora chaves
   aleatoriamente, o mesmo input gera caminhos diferentes. Você não ganha uma
   sem levar a outra.

4. **Onde a variância se multiplica: Autonomia.** Cada decisão autônoma abre um
   fork. Sem contenção, a trajetória do agente diverge irremediavelmente. O
   efeito cascata em cadeia transforma variância baixa em caos de trajetória.

5. **As fronteiras do sistema.** O maior erro de quem começa é construir o
   Sistema como se ele fosse o Modelo. A hierarquia correta:
   - **Modelo / LLM** — apenas uma peça. O mecanismo de inferência.
   - **Agente** — o comportamento que emerge quando o motor roda.
   - **Harness** — a engenharia em volta do núcleo.
   - **Sistema / Produto** — o que você, dev, constrói e entrega ao usuário.

6. **A equação da confiabilidade.** `Confiabilidade = Capacidade × Estrutura de
   Harness`. O modelo produz inteligência com variância; o harness converte essa
   inteligência variável em comportamento previsível. Componentes: saídas
   estruturadas, validação de schema, retries e fallbacks, evals e regressão,
   observabilidade, gates de revisão.

7. **A Matriz de Responsabilidades.** Cada camada tem natureza e
   responsabilidade distintas:
   - **LLM** — probabilístico. Gera raciocínio e texto.
   - **Runtime** — determinístico. Controla o loop de execução.
   - **Permission Gate** — determinístico. Garante segurança das ferramentas.
   - **Context Manager** — determinístico. Gerencia memória e estado.
   - **Guides** — regras. Orientam decisões antes da ação.
   - **Sensors** — observação. Detectam problemas pós-ação.

   Runtime, Permission Gate, Context Manager, Guides e Sensors são 100% código
   determinístico. É o trabalho do engenheiro, não do modelo.

8. **Anatomia do Runtime: o Loop do Agente.** O harness não pensa. Ele loopa.
   Todo o "raciocínio" acontece dentro do Model Call. O resto é infraestrutura
   de roteamento e segurança. Fluxo: Context Manager (monta prompt) → Model Call
   (a mágica acontece) → Tool Use? → se sim: Permission Gate → Tool Execution
   (sandbox) → Result (adiciona ao contexto) → volta ao Context Manager. Se não:
   sai do loop.

9. **Feedforward e Feedback (Guides vs Sensors).** Guides previnem. Sensors
   corrigem. Sem guides, o agente erra livremente. Sem sensors, você não sabe
   que ele errou.
   - **Guides (feedforward):** Instruções (o que fazer), Conhecimento (como
     fazer), Restrições (o que não fazer).
   - **Sensors (feedback):** Monitoramento, Validação (checar output),
     Observabilidade (ver o que ocorreu).

10. **A topologia do sistema: Amplo vs Estrito.** O Harness Estrito (Agent
    Runtime) vive dentro do Harness Amplo (Sistema de Controle).
    - **Harness Amplo:** Guides (AGENTS.md, system prompts, skills) e Sensors
      (Hooks, Evals, CI, Observability).
    - **Harness Estrito:** Model, Context Manager, Tool Dispatch, Permission
      Gate.

11. **As Três Alavancas de Controle em Produção.** O treinamento é distante e
    caro. Na camada de aplicação (seu harness), você tem controle imediato sobre
    três eixos:
    - **Conhecimento** — controla de onde a informação vem. Aumentar: RAG,
      few-shot, glossários. Diminuir: escopo fechado, remover ruído.
    - **Raciocínio** — controla o espaço de pensamento. Aumentar: CoT, reasoning
      budget, decomposição. Diminuir: resposta direta, extração simples.
    - **Autonomia/Agência** — controla a arquitetura. Aumentar: loops abertos,
      mais tools. Diminuir: gates humanos, validação por schema, limite de loops.

12. **O preço arquitetural: A Lição Amarga.** A estrutura que você crava hoje é
    conhecimento congelado em código. Funciona agora, mas é andaime de obra.
    Quanto mais específico o harness, menor seu prazo de validade. Harnesses de
    restrição construídos para modelos fracos viram gargalos técnicos quando o
    modelo evolui. A capacidade nativa do modelo cresce em saltos. O andaime
    antigo barra as novas APIs.

13. **Os 5 Princípios Fundamentais de Harness Engineering.**
    1. O LLM é apenas um componente. O sistema é o Harness.
    2. O runtime coordena, mas não raciocina. Quem gera inteligência é o modelo.
    3. Toda chamada autônoma abre um fork de variância. Contenha com permissões
       rígidas.
    4. Guides reduzem erros antes (feedforward). Sensors detectam erros depois
       (feedback).
    5. Confiabilidade não se compra com dinheiro, compra-se com restrição.

## Mapa dos exercícios

| Pasta | Conceito que torna visceral |
|-------|-----------------------------|
| `ex01-diverging-responses` | (1) (3) O mesmo prompt diverge entre execuções. |
| `ex02-variance-cascade` | (4) A variância se multiplica em cascata na autonomia. |
| `ex03-with-and-without-harness` | (6) A diferença de confiabilidade com e sem harness. |
| `ex04-runtime-loop` | (7) (8) O runtime não pensa — ele roteia. |
| `ex05-feedforward-feedback` | (9) Guides previnem; sensors detectam. |
| `ex06-aggressive-harness` | (12) Restrição demais também é falha arquitetural. |

## Regras para o Claude Code trabalhar neste repo

- **NUNCA use frameworks de agente** (LangChain, LangGraph, Mastra, CrewAI,
  similares). Tudo na mão, para que a estrutura do harness fique visível no
  código.
- **Cliente Anthropic compartilhado.** O wrapper de autenticação + carregamento
  do `.env` vive em `packages/client` (`@harness/client`) e é importado pelos
  exercícios via npm workspace. Não duplique esse código nas pastas; edite só a
  fonte canônica em `packages/client/src/client.ts`. Trade-off assumido: as
  pastas **não** são mais copiáveis isoladas — rodam só dentro do monorepo
  (`npm install` na raiz linka o workspace). Qualquer outra lib específica de um
  exercício continua local à pasta dele.
- **Não "corrija" o comportamento cru.** Os exercícios que expõem o modelo sem
  validação (ex01, ex02, o `without-harness` do ex03) são assim de propósito.
  Adicionar schema/retry/validação a eles destrói o ponto pedagógico.
- **O objetivo é a experiência visceral do conceito, não código bonito.**
  Prefira scripts simples e legíveis a abstrações elegantes.
- **Modelo:** todos os scripts leem `ANTHROPIC_MODEL` do `.env` (default
  `claude-sonnet-4-6`). O ex02 e qualquer uso de `temperature` exigem um modelo
  da família 4.x que aceite sampling — Opus 4.7/4.8 e Fable 5 retornam HTTP 400
  para `temperature`. Não troque o default por um modelo incompatível.
- **Verificação:** como os exercícios chamam a API ao vivo e são
  não-determinísticos por design, o gate é compilação limpa (`npm run
  typecheck`) e execução (`npm start`), não testes de saída.
