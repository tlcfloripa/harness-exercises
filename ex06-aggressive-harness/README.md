# ex06 · Aggressive Harness

> Conceito (12) **A Lição Amarga / o preço arquitetural**.

O mesmo agente de sumarização, o mesmo texto, o mesmo modelo — em dois harnesses:
um restrito demais e um calibrado.

## O que demonstra

Harness não é "quanto mais, melhor". O modo restrito aplica 16 regras rígidas
(limite de palavras, formato obrigatório, palavras proibidas, lista fechada de
tópicos) que estrangulam o modelo: o resultado fica mecânico, truncado e perde a
nuance — justamente os trade-offs e a recomendação que importavam.

O harness agressivo foi desenhado para um modelo fraco que precisava de rédea
curta. Aplicado a um modelo capaz, ele não protege — bloqueia a capacidade
nativa. Restrição demais também é falha arquitetural.

## Como rodar

```bash
npm install            # uma vez, na raiz
cd ex06-aggressive-harness
npm start
```

## O que observar

- Os dois resumos lado a lado, com contagem de palavras e de marcadores de
  nuance preservados.
- A seção **"O QUE O HARNESS AGRESSIVO SACRIFICOU"**: quais ressalvas e
  trade-offs sobreviveram no modo calibrado mas se perderam no restrito.
- Como a lista fechada de tópicos descarta a dívida técnica, as palavras
  proibidas matam as ressalvas, e o limite de palavras achata o resto.

A lição: calibre o harness ao modelo, não ao medo. O andaime que você crava hoje
tem prazo de validade — quanto mais rígido, mais cedo ele vira gargalo.
