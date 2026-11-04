# Cartalog — Pokémon TCG

Aplicação inicial para buscar uma carta pela numeração, escolher entre impressões em coleções diferentes e consultar preços por variante.

## Rodando localmente

```bash
npm install
npm start
```

## Dados e preços

O catálogo, imagens, variantes e preços internacionais vêm da [Pokémon TCG API](https://docs.pokemontcg.io/). A busca não exige chave de API, mas está sujeita aos limites públicos do serviço. Os valores são exibidos na moeda publicada pela fonte: TCGplayer em USD e Cardmarket em EUR.

A Liga Pokémon é uma referência brasileira útil, mas não encontrei uma API pública documentada para integrar preços em reais nesta primeira versão. Por isso, o app oferece o link para consulta e não apresenta preços internacionais como se fossem valores brasileiros.

## Escopo atual

- Busca por número da carta, inclusive numerações promocionais como `TG01`.
- Seleção entre impressões que compartilham a mesma numeração.
- Imagem, coleção, raridade, ilustrador e variantes com preço disponível.
- Links diretos às fontes quando fornecidos pela API.

## Stack

React, Create React App, Tailwind CSS e lucide-react.
