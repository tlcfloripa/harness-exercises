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

## Resultado testado

> Execução real em `2026-06-27` · modelo `claude-sonnet-4-6` · mesmo texto, dois
> harnesses. Não-determinístico; rodada representativa.

```
MODO RESTRITO · 16 regras rígidas
  - Avalie desempenho sob carga alta
  - Monitore custo ante renovação contratual
  - Confirme prazo ante dívida acumulada
  palavras: 19 · marcadores de nuance preservados: 2

MODO CALIBRADO · só o essencial
  • latência/custo caíram, mas picos sob carga alta sem causa identificada
  • suporte premium pode encarecer a partir do próximo ano → renegociar
  • entrega no prazo veio com dívida técnica a pagar
  • balanço positivo, mas dois gatilhos críticos a gerenciar
  palavras: 95 · marcadores de nuance preservados: 4

Marcadores presentes no calibrado e PERDIDOS no restrito: "mas", "renegoci..."
```

O modo restrito comprimiu o texto a **19 palavras** e só **2 marcadores de
nuance**, virando uma lista mecânica de comandos imperativos — perdeu os
trade-offs e a recomendação condicional. O calibrado manteve **95 palavras** e **4
marcadores**, preservando as ressalvas ("mas", "renegoci...") que carregam a
informação que importa. Mesmo modelo, mesmo texto: o harness rígido demais não
protegeu, **bloqueou** a capacidade nativa.
