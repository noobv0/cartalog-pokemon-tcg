# Cartalog — Pokémon TCG

Catálogo de cartas Pokémon em português brasileiro, com busca por numeração e consulta de anúncios ativos da Liga Pokémon em reais (BRL).

## Rodando localmente

```bash
npm install
npm start
```

Para ativar a consulta de preços localmente, execute o projeto com o runtime de Vercel (`vercel dev`) e defina `APIFY_TOKEN` no ambiente. Em produção, adicione `APIFY_TOKEN` nas variáveis de ambiente do projeto Vercel e faça um novo deploy.

## Fontes e preços

- Catálogo, impressões e imagens: [TCGdex](https://tcgdex.dev), conjunto pt-BR.
- Ofertas: anúncios ativos da [Liga Pokémon](https://www.ligapokemon.com.br/), consultados pelo ator de terceiros [Apify Liga Pokémon Scraper](https://apify.com/gio21/ligapokemon-scraper).
- Valores exibidos em reais, conforme os anúncios retornados. São preços pedidos por vendedores, não histórico de vendas concluídas.
- O ator Apify não é oficial nem afiliado à Liga Pokémon. Consulte a página do ator para tarifas atualizadas. O Cartalog limita cada busca a um produto e no máximo 20 anúncios retornados; cada consulta pode gerar cobrança na conta Apify.

## Variantes

O catálogo lista cada impressão e raridade, incluindo artes especiais. O acabamento (por exemplo, Normal, Foil ou Reverse Foil) é filtrado conforme informado nos anúncios encontrados. Full art representa uma categoria de arte/raridade da impressão, não um acabamento intercambiável.

## Configuração Vercel

Adicione `APIFY_TOKEN` como variável de ambiente **server-side** no projeto `cartalog-pokemon-tcg`. Nunca coloque esse token em variáveis `REACT_APP_*` ou no código-fonte.

## Stack

React, Create React App, Vercel Functions e lucide-react.
