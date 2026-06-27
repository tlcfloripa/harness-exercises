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
