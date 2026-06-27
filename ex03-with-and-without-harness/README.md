# ex03 · With and Without Harness

> Conceito (6) **Confiabilidade = Capacidade × Estrutura de Harness**.

O mesmo problema de extração, com um texto ambíguo, resolvido de dois jeitos: a
chamada nua e a mesma chamada cercada de harness. A taxa de sucesso muda de
forma gritante — com o **mesmo modelo**.

## O que demonstra

A capacidade bruta é idêntica nos dois lados. O que separa "quebra na segunda
demo" de "funciona em produção" não é um modelo melhor, é a estrutura:

- **saída estruturada** — extrai JSON mesmo de respostas com cercas/prosa;
- **validação de schema** (zod) — barra o que está fora do contrato;
- **retry com backoff** — re-pergunta devolvendo o erro de validação ao modelo;
- **fallback estruturado** — se tudo falhar, entrega algo válido e marcado, em
  vez de explodir.

## Como rodar

```bash
npm install            # uma vez, na raiz
cd ex03-with-and-without-harness
npm start              # roda a comparação (5× cada lado)

# opcionais, para inspecionar cada lado isolado:
npm run without
npm run with
```

## O que observar

- No **sem harness**: runs que nem parseiam (cercas/prosa) e runs que parseiam
  mas violam o contrato (`"médio"` em vez de `"medium"`, orçamento como string).
- No **com harness**: quantas tentativas cada run precisou, e quando o fallback
  entrou.
- O **placar final**: a taxa "conforme o contrato" sem harness vs. a taxa
  validada com harness — e o fato de que o harness **nunca** estoura.

Confiabilidade não se compra com dinheiro (modelo maior). Compra-se com
restrição em volta do mesmo modelo.

## Resultado testado

> Execução real em `2026-06-27` · modelo `claude-sonnet-4-6` · 5 execuções de cada
> lado. Não-determinístico; rodada representativa.

```
SEM HARNESS · chamada nua + JSON.parse
  run 1..5: ✘ FALHA — nem parseou (Unexpected token '`', "```json ...)

COM HARNESS · saída estruturada + zod + retry + fallback
  run 1..5: ✔ OK em 1 tentativa(s)

TAXA DE SUCESSO
SEM harness · output conforme o contrato : 0/5  (0%)
COM harness · validado sem fallback      : 5/5  (100%)
COM harness · conforme o schema (incl. fallback) : 5/5  (100%)
```

Mesmo modelo, mesmo prompt base: **0/5 sem harness vs. 5/5 com harness**. Nesta
rodada, as 5 falhas do lado cru foram todas pelo mesmo motivo — o modelo embrulhou
o JSON em cercas ` ```json `, e o `JSON.parse` direto explodiu no primeiro
caractere. Do lado com harness, o strip de cercas + validação zod bastaram: todas
as runs passaram **na 1ª tentativa**, sem precisar de retry nem do fallback.
