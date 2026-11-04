import React, { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, ExternalLink, LoaderCircle, ArrowUpRight, Layers3, CircleDollarSign, ImageOff } from 'lucide-react';

const CATALOG = 'https://api.tcgdex.net/v2/pt-br';
const PRICES = 'https://api.pokemontcg.io/v2/cards';
const FX = 'https://api.frankfurter.dev/v2/rate';
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const sourceMoney = (value, code) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code }).format(value);
const imageFor = (card, size = 'high') => card?.image ? `${card.image}/${size}.webp` : '';
const cardTotal = card => card?.set?.cardCount?.official || card?.set?.cardCount?.total || '';

function getMarketPrices(card) {
  const rows = [];
  const tcg = card?.tcgplayer?.prices || {};
  const names = { normal: 'Normal', holofoil: 'Foil', reverseHolofoil: 'Reverse foil', '1stEditionNormal': 'Normal · 1ª edição', '1stEditionHolofoil': 'Foil · 1ª edição', unlimitedHolofoil: 'Foil · ilimitada', unlimitedNormal: 'Normal · ilimitada' };
  Object.entries(tcg).forEach(([variant, values]) => {
    const value = values?.market ?? values?.mid ?? values?.directLow;
    if (Number.isFinite(Number(value)) && Number(value) > 0) rows.push({ source: 'TCGplayer', variant: names[variant] || variant, value: Number(value), currency: 'USD', url: card.tcgplayer?.url });
  });
  const market = card?.cardmarket?.prices || {};
  const euro = market.trendPrice ?? market.averageSellPrice ?? market.lowPrice;
  if (Number.isFinite(Number(euro)) && Number(euro) > 0) rows.push({ source: 'Cardmarket', variant: 'Tendência geral', value: Number(euro), currency: 'EUR', url: card.cardmarket?.url });
  return rows;
}

function CardResult({ card, selected, onSelect }) {
  return <button className={`card-result ${selected ? 'selected' : ''}`} onClick={onSelect}>
    <img src={imageFor(card, 'low')} alt={card.name} />
    <span className="result-copy"><strong>{card.name}</strong><span>{card.set?.name} · {card.localId}/{cardTotal(card) || '?'}</span></span>
    <span className="result-price">{card.rarity || 'Impressão'}<small>{card.set?.releaseDate || 'Pokémon TCG'}</small></span>
  </button>;
}

function App() {
  const [number, setNumber] = useState('');
  const [cards, setCards] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [error, setError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [marketPrices, setMarketPrices] = useState([]);
  const [rates, setRates] = useState({});
  const selected = cards.find(card => card.id === selectedId) || cards[0];

  async function search(event) {
    event?.preventDefault();
    const input = number.trim();
    const [valuePart, totalPart] = input.split('/');
    const value = valuePart.trim();
    const total = totalPart?.trim();
    if (!value) return;
    setLoading(true); setError(''); setMarketPrices([]); setCards([]); setSelectedId('');
    try {
      const params = new URLSearchParams({ localId: `eq:${value}` });
      const response = await fetch(`${CATALOG}/cards?${params}`);
      if (!response.ok) throw new Error('Não foi possível consultar o catálogo agora.');
      const briefCards = await response.json();
      const details = await Promise.all(briefCards.slice(0, 60).map(async item => {
        const detail = await fetch(`${CATALOG}/cards/${encodeURIComponent(item.id)}`);
        return detail.ok ? detail.json() : null;
      }));
      const matches = details.filter(card => card && (!total || String(cardTotal(card)) === total));
      setCards(matches);
      if (!matches.length) setError('Nenhuma carta encontrada com essa numeração. Tente, por exemplo, 25, 25/198 ou TG01.');
    } catch (e) {
      setError(e.message || 'Falha ao buscar cartas. Verifique sua conexão e tente de novo.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoadingPrices(true); setPriceError(''); setMarketPrices([]); setRates({});
    (async () => {
      try {
        const query = new URLSearchParams({ q: `id:"${selected.id}"`, pageSize: '10' });
        let response = await fetch(`${PRICES}?${query}`);
        if (!response.ok) throw new Error('A fonte de preços está temporariamente indisponível.');
        let data = await response.json();
        let match = data.data?.find(card => card.id === selected.id);
        if (!match) {
          const byNumber = new URLSearchParams({ q: `number:"${selected.localId}"`, pageSize: '100' });
          response = await fetch(`${PRICES}?${byNumber}`);
          if (response.ok) {
            data = await response.json();
            match = data.data?.find(card => card.number === selected.localId && card.set?.id === selected.set?.id);
          }
        }
        if (!match) throw new Error('Não encontrei esta impressão nas fontes internacionais gratuitas.');
        const prices = getMarketPrices(match);
        if (!prices.length) throw new Error('Ainda não há preços publicados para esta impressão.');
        const currencies = [...new Set(prices.map(price => price.currency))];
        const ratePairs = await Promise.all(currencies.map(async code => {
          const result = await fetch(`${FX}/${code.toLowerCase()}/brl`);
          if (!result.ok) throw new Error('A conversão cambial está temporariamente indisponível.');
          return [code, await result.json()];
        }));
        if (cancelled) return;
        setMarketPrices(prices);
        setRates(Object.fromEntries(ratePairs.map(([code, data]) => [code, { value: data.rate, date: data.date }])));
        if (match.tcgplayer?.url) match._sourceUrls = { tcgplayer: match.tcgplayer.url, cardmarket: match.cardmarket?.url };
      } catch (e) {
        if (!cancelled) setPriceError(e.message || 'Falha ao carregar preços.');
      } finally { if (!cancelled) setLoadingPrices(false); }
    })();
    return () => { cancelled = true; };
  }, [selected?.id, selected?.localId, selected?.set?.id]);

  const cheapest = marketPrices.length ? Math.min(...marketPrices.map(price => price.value * (rates[price.currency]?.value || 0))) : null;
  const fxDate = Object.values(rates).map(rate => rate.date).sort().at(-1);
  const sourceUrls = marketPrices.reduce((urls, price) => ({ ...urls, [price.source]: price.url || urls[price.source] }), {});
  const ligaUrl = 'https://www.ligapokemon.com.br/';

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Cartalog"><span className="brand-mark"><Layers3 size={19}/></span><span>cart<span className="brand-accent">a</span>log</span></a><span className="top-note"><span className="live-dot"/> POKÉMON TCG · BRASIL</span></header>
    <section className="intro">
      <div className="eyebrow"><Sparkles size={14}/> UM OLHAR MAIS CLARO SOBRE SUA COLEÇÃO</div>
      <h1>Encontre a carta.<br/><em>Descubra o valor.</em></h1>
      <p>Pesquise pela numeração, escolha a impressão e compare referências internacionais convertidas para reais.</p>
    </section>
    <form className="search-panel" onSubmit={search}>
      <label htmlFor="card-number">NÚMERO IMPRESSO NA CARTA</label>
      <div className="search-box"><Search size={19}/><input id="card-number" value={number} onChange={e => setNumber(e.target.value)} placeholder="Ex.: 25, 199 ou TG01" autoComplete="off"/><button type="submit" disabled={loading || !number.trim()}>{loading ? <LoaderCircle className="spin" size={18}/> : 'Buscar cartas'}</button></div>
      <div className="search-hint">Você também pode incluir o total da coleção, como 25/198, para refinar a busca.</div>
    </form>
    {loading && <div className="status"><LoaderCircle className="spin" size={20}/> Procurando impressões no catálogo…</div>}
    {error && !loading && <div className="status error">{error}</div>}
    {!loading && cards.length > 0 && <section className="results-section">
      <div className="section-heading"><div><span className="section-kicker">IMPRESSÕES ENCONTRADAS</span><h2>Escolha a carta certa</h2></div><span className="result-count">{cards.length} {cards.length === 1 ? 'carta' : 'cartas'}</span></div>
      <div className="results-layout">
        <div className="results-list">{cards.map(card => <CardResult key={card.id} card={card} selected={card.id === selected?.id} onSelect={() => setSelectedId(card.id)}/>)}</div>
        {selected && <article className="detail-card">
          <div className="detail-top"><div><span className="section-kicker">IMPRESSÃO SELECIONADA</span><h2>{selected.name}</h2><p>{selected.set?.name} <span className="bullet">·</span> {selected.localId}/{cardTotal(selected) || '?'}</p></div><span className="rarity">{selected.rarity || 'Pokémon TCG'}</span></div>
          <div className="card-showcase"><img src={imageFor(selected)} alt={selected.name}/></div>
          <div className="metadata"><div><span>COLEÇÃO</span><strong>{selected.set?.name || '—'}</strong></div><div><span>LANÇAMENTO</span><strong>{selected.set?.releaseDate || '—'}</strong></div><div><span>RARIDADE</span><strong>{selected.rarity || '—'}</strong></div></div>
          <div className="price-heading"><div><CircleDollarSign size={18}/><h3>Referências de mercado</h3></div><span>CONVERTIDAS PARA BRL</span></div>
          <p className="price-caption">TCGplayer (EUA) e Cardmarket (Europa). Conversão cambial diária; não representa preço praticado no Brasil.</p>
          {loadingPrices && <div className="offer-state"><LoaderCircle className="spin" size={17}/> Buscando preços e cotação…</div>}
          {!loadingPrices && priceError && <div className="offer-state setup">{priceError}</div>}
          {!loadingPrices && marketPrices.length > 0 && <>
            <div className="price-summary"><div><span>MENOR REFERÊNCIA</span><strong>{cheapest != null ? brl.format(cheapest) : '—'}</strong></div><div><span>ATUALIZADO</span><strong>{fxDate || '—'}</strong></div><a href={ligaUrl} target="_blank" rel="noreferrer">Liga Pokémon <ArrowUpRight size={14}/></a></div>
            <div className="price-list">{marketPrices.map((price, index) => <div className="price-row" key={price.source + price.variant + index}>
              <span className="price-source"><strong>{price.source} · {price.variant}</strong><small>{sourceMoney(price.value, price.currency)} · câmbio de {rates[price.currency]?.date || '—'}</small></span>
              <span className="offer-value">{rates[price.currency] ? brl.format(price.value * rates[price.currency].value) : '—'}{price.url && <a href={price.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${price.source}`}><ArrowUpRight size={13}/></a>}</span>
            </div>)}</div>
          </>}
          <div className="price-footnote"><a href={ligaUrl} target="_blank" rel="noreferrer">Consultar Liga Pokémon <ExternalLink size={12}/></a><span>Cotação de referência; não inclui frete ou taxas.</span></div>
        </article>}
      </div>
    </section>}
    {!loading && !error && cards.length === 0 && <section className="empty-state"><div className="empty-icon"><ImageOff size={22}/></div><strong>Comece pela numeração da carta</strong><span>Encontre a impressão e compare referências de mercado em reais.</span></section>}
    <footer><span>CATÁLOGO PT-BR VIA TCGDEX · PREÇOS VIA TCGPLAYER / CARDMARKET</span><span>Feito para quem coleciona <span className="footer-star">✳</span></span></footer>
  </main>;
}

export default App;
