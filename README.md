# Cartalog — Pokémon TCG

Catálogo de cartas em português brasileiro, com busca por numeração e referências de preço gratuitas convertidas para reais.

## Rodando localmente

```bash
npm install
npm start
```

## Fontes e preços

- Catálogo, impressões e imagens: [TCGdex](https://tcgdex.dev), conjunto pt-BR.
- Referências de mercado: [Pokémon TCG API](https://docs.pokemontcg.io/) (TCGplayer em USD e Cardmarket em EUR).
- Conversão: [Frankfurter](https://frankfurter.dev/), API pública sem chave, com taxas de referência que são atualizadas diariamente.
- Os valores convertidos não são anúncios da Liga Pokémon nem preços efetivos no Brasil. Não incluem impostos, frete, taxas de importação ou diferenças de liquidez.

Todos os serviços usados têm acesso gratuito e sem uma chave paga; estão sujeitos aos limites de uso de cada provedor. Os preços podem não estar disponíveis para todas as cartas ou acabamentos.

## Variantes

O catálogo lista cada impressão e sua raridade, incluindo artes especiais. Os acabamentos Normal, Foil e Reverse Foil aparecem conforme publicados nas variantes do TCGplayer. A Cardmarket fornece uma tendência geral, sem separar todos os acabamentos. Full art é uma categoria de arte/raridade da impressão, não um acabamento intercambiável.

## Stack

React, Create React App e lucide-react.
