# ex04 · Runtime Loop

> Conceitos (7) **Matriz de Responsabilidades** e (8) **Anatomia do Runtime**.

O loop do agente construído na mão, com cada estágio nomeado no terminal. O
harness não pensa — ele loopa.

## O que demonstra

Todo o "raciocínio" acontece dentro de **uma** chamada (Model Call). Tudo ao
redor é infraestrutura determinística de roteamento e segurança, escrita pelo
engenheiro:

```
Context Manager → Model Call → Tool Use? → Permission Gate → Tool Execution → Result → (volta)
                                   │ não
                                   └─→ texto final → sai do loop
```

A tarefa força múltiplos passos (buscar dois produtos, somar, aplicar desconto),
então o loop roda várias iterações antes de produzir a resposta final.

## Como rodar

```bash
npm install            # uma vez, na raiz
cd ex04-runtime-loop
npm start
```

## O que observar

- A cada iteração, o **estado completo**: tamanho do histórico, o que o modelo
  respondeu, se foi detectada uma chamada de ferramenta, a decisão do
  **Permission Gate**, e o resultado da execução.
- Que o loop em si é **burro**: só checa formato, consulta uma allowlist, executa
  e devolve o resultado ao contexto. A inteligência inteira está no Model Call.
- O **Permission Gate** em ação: ele só permite `buscar_produto` e `calcular`. Se
  o modelo tentar inventar outra ferramenta, o gate rejeita com erro estruturado
  e o loop continua.

Ferramentas, allowlist, limite de iterações — nada disso é o modelo. É o harness.

## Resultado testado

> Execução real em `2026-06-27` · modelo `claude-sonnet-4-6`. A tarefa: somar um
> teclado e um mouse do catálogo e aplicar 10% de desconto.

```
ITERAÇÃO 1 · Model Call → tool "buscar_produto" {"query":"teclado"}
            Permission Gate ✔ permitida → [{"nome":"Teclado mecânico","preco":350}]
ITERAÇÃO 2 · Model Call → tool "buscar_produto" {"query":"mouse"}
            Permission Gate ✔ permitida → [{"nome":"Mouse sem fio","preco":120}]
ITERAÇÃO 3 · Model Call → tool "calcular" {"expressao":"(350+120)*0.9"}
            Permission Gate ✔ permitida → 423
ITERAÇÃO 4 · Model Call → texto puro detectado. SAINDO DO LOOP.

RESPOSTA FINAL: Total final R$ 423,00 (subtotal R$ 470,00 − 10%).
```

O loop rodou **4 iterações**: 3 chamadas de ferramenta (todas dentro da allowlist,
liberadas pelo gate) e 1 turno final de texto puro que encerrou o loop. O harness
não calculou nada — só roteou JSON, consultou a allowlist, executou e devolveu o
resultado ao contexto. O raciocínio (decidir buscar cada produto, montar a
expressão `(350+120)*0.9`) ficou inteiro dentro do Model Call. Nesta rodada o
modelo só usou ferramentas permitidas, então o gate não precisou rejeitar nenhuma.
