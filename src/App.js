import React, { useState } from 'react';
import { Search, Sparkles, ExternalLink, LoaderCircle, ArrowUpRight, Layers3, CircleDollarSign, ImageOff } from 'lucide-react';

const API = 'https://api.pokemontcg.io/v2/cards';

function money(value, currency) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));
}

function getPrices(card) {
  const prices = [];
  const tcg = card.tcgplayer?.prices || {};
  Object.entries(tcg).forEach(([variant, data]) => {
    if (data?.market != null) prices.push({ source: 'TCGplayer', variant, value: data.market, currency: 'USD' });
  });
  const market = card.cardmarket?.prices || {};
  [['averageSellPrice', 'Média de venda'], ['trendPrice', 'Tendência'], ['lowPrice', 'Menor preço']].forEach(([key, label]) => {
    if (market[key] != null) prices.push({ source: 'Cardmarket', variant: label, value: market[key], currency: 'EUR' });
  });
  return prices;
}

function CardResult({ card, selected, onSelect }) {
  const prices = getPrices(card);
  return <button className={`card-result ${selected ? 'selected' : ''}`} onClick={onSelect}>
    <img src={card.images?.small} alt={card.name} />
    <span className="result-copy"><strong>{card.name}</strong><span>{card.set?.name} · {card.number}/{card.set?.printedTotal || card.set?.total}</span></span>
    <span className="result-price">{prices.length ? money(prices[0].value, prices[0].currency) : 'Sem preço'}<small>{prices[0]?.source || 'Catálogo'}</small></span>
  </button>;
}

function PriceTable({ card }) {
  const prices = getPrices(card);
  if (!prices.length) return <div className="no-prices">Ainda não há preço disponível para esta impressão nas fontes conectadas.</div>;
  return <div className="price-list">{prices.map((price, index) => <div className="price-row" key={price.source + price.variant + index}>
    <span className="price-source"><strong>{price.source}</strong><small>{price.variant}</small></span>
    <strong className="price-value">{money(price.value, price.currency)}</strong>
  </div>)}</div>;
}

export default function App() {
  const [number, setNumber] = useState('');
  const [cards, setCards] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const selected = cards.find(card => card.id === selectedId) || cards[0];

  async function search(event) {
    event?.preventDefault();
    const value = number.trim();
    if (!value) return;
    setLoading(true); setError(''); setCards([]); setSelectedId('');
    try {
      const response = await fetch(`${API}?${new URLSearchParams({ q: `number:"${value.replaceAll('"', '')}"`, pageSize: '30', orderBy: 'set.releaseDate' })}`);
      if (!response.ok) throw new Error(response.status === 429 ? 'Limite de consultas atingido. Tente novamente em alguns minutos.' : 'Não foi possível consultar o catálogo agora.');
      const data = await response.json();
      setCards(data.data || []);
      if (!data.data?.length) setError('Nenhuma carta encontrada com essa numeração. Confira se digitou apenas o número (ex.: 25 ou TG01).');
    } catch (e) {
      setError(e.message || 'Falha ao buscar cartas. Verifique sua conexão e tente de novo.');
    } finally { setLoading(false); }
  }

  const ligaUrl = 'https://www.ligapokemon.com.br/';

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Coleção"><span className="brand-mark"><Layers3 size={20}/></span><span>cart<span className="brand-accent">a</span>log</span></a><span className="top-note"><span className="live-dot"/> BUSCA DE CARTAS</span></header>
    <section className="intro">
      <div className="eyebrow"><Sparkles size={14}/> SEU CATÁLOGO DE TCG</div>
      <h1>Quanto vale<br/><em>essa carta?</em></h1>
      <p>Pesquise pela numeração e compare variantes, coleções e preços em fontes disponíveis.</p>
    </section>
    <form className="search-panel" onSubmit={search}>
      <label htmlFor="card-number">NUMERAÇÃO DA CARTA</label>
      <div className="search-box"><Search size={19}/><input id="card-number" value={number} onChange={e => setNumber(e.target.value)} placeholder="Ex.: 25, 199 ou TG01" autoComplete="off"/><button type="submit" disabled={loading || !number.trim()}>{loading ? <LoaderCircle className="spin" size={18}/> : 'Buscar carta'}</button></div>
      <div className="search-hint">Digite o número que aparece no canto inferior da carta. Se houver várias coleções, escolha a impressão correta.</div>
    </form>
    {loading && <div className="status"><LoaderCircle className="spin" size={20}/> Procurando no catálogo Pokémon TCG…</div>}
    {error && !loading && <div className="status error">{error}</div>}
    {!loading && cards.length > 0 && <section className="results-section">
      <div className="section-heading"><div><span className="section-kicker">RESULTADOS</span><h2>{cards.length} {cards.length === 1 ? 'impressão encontrada' : 'impressões encontradas'}</h2></div><span className="result-count">Pokémon TCG</span></div>
      <div className="results-layout">
        <div className="results-list">{cards.map(card => <CardResult key={card.id} card={card} selected={card.id === selected?.id} onSelect={() => setSelectedId(card.id)}/>)}</div>
        {selected && <article className="detail-card">
          <div className="detail-top"><div><span className="section-kicker">DETALHES DA IMPRESSÃO</span><h2>{selected.name}</h2><p>{selected.set?.name} <span className="bullet">·</span> {selected.number}/{selected.set?.printedTotal || selected.set?.total}</p></div><span className="rarity">{selected.rarity || 'Pokémon TCG'}</span></div>
          <div className="card-showcase"><img src={selected.images?.large || selected.images?.small} alt={selected.name}/></div>
          <div className="metadata"><div><span>COLEÇÃO</span><strong>{selected.set?.name || '—'}</strong></div><div><span>LANÇAMENTO</span><strong>{selected.set?.releaseDate || '—'}</strong></div><div><span>ILUSTRADOR</span><strong>{selected.artist || '—'}</strong></div></div>
          <div className="price-heading"><div><CircleDollarSign size={18}/><h3>Preços por variante</h3></div><span>VALORES NA MOEDA ORIGINAL</span></div>
          <PriceTable card={selected}/>
          <div className="price-footnote">Preços de referência internacionais; USD e EUR não são convertidos para reais. Valores e disponibilidade podem variar.</div>
          <div className="source-links">{selected.tcgplayer?.url && <a href={selected.tcgplayer.url} target="_blank" rel="noreferrer">Ver no TCGplayer <ArrowUpRight size={14}/></a>}{selected.cardmarket?.url && <a href={selected.cardmarket.url} target="_blank" rel="noreferrer">Ver no Cardmarket <ArrowUpRight size={14}/></a>}<a href={ligaUrl} target="_blank" rel="noreferrer">Consultar Liga Pokémon <ExternalLink size={13}/></a></div>
        </article>}
      </div>
    </section>}
    {!loading && !error && cards.length === 0 && <section className="empty-state"><div className="empty-icon"><ImageOff size={22}/></div><strong>A busca começa pela numeração</strong><span>Encontre a carta e veja suas impressões e variantes de preço.</span></section>}
    <footer><span>CATÁLOGO E PREÇOS VIA POKÉMON TCG API</span><span>Feito para quem coleciona <span className="footer-star">✳</span></span></footer>
  </main>;
}