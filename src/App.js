import React, { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, ExternalLink, LoaderCircle, ArrowUpRight, Layers3, CircleDollarSign, ImageOff, RotateCw } from 'lucide-react';

const CATALOG = 'https://api.tcgdex.net/v2/pt-br';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const imageFor = (card, size = 'high') => card?.image ? `${card.image}/${size}.webp` : '';
const cardTotal = card => card?.set?.cardCount?.official || card?.set?.cardCount?.total || '';
const finishName = value => String(value || 'Acabamento não informado').replace(/reverse\s*foil/i, 'Reverse foil').replace(/holo/i, 'Foil');

function CardResult({ card, selected, onSelect }) {
  return <button className={`card-result ${selected ? 'selected' : ''}`} onClick={onSelect}>
    <img src={imageFor(card, 'low')} alt={card.name} />
    <span className="result-copy"><strong>{card.name}</strong><span>{card.set?.name} · {card.localId}/{cardTotal(card) || '?'}</span></span>
    <span className="result-price">{card.rarity || 'Impressão'}<small>{card.set?.releaseDate || 'Pokémon TCG'}</small></span>
  </button>;
}

function offerPrice(offer) {
  const raw = offer.price ?? offer.value ?? offer.amount;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return Number(raw.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  return NaN;
}

function normalizeOffers(payload) {
  const roots = Array.isArray(payload) ? payload : payload?.items || payload?.results || payload?.data || [];
  const offers = [];
  const visit = (obj, depth = 0) => {
    if (!obj || depth > 4) return;
    if (Array.isArray(obj)) { obj.forEach(entry => visit(entry, depth + 1)); return; }
    if (typeof obj !== 'object') return;
    const price = offerPrice(obj);
    if (Number.isFinite(price) && price > 0) {
      offers.push({
        price,
        finish: finishName(obj.finish || obj.variant || obj.foilType || obj.extrasCode),
        seller: obj.seller || obj.sellerName || obj.store || 'Vendedor da Liga Pokémon',
        condition: obj.condition || obj.cardCondition || '',
        language: obj.language || obj.lang || 'Português',
        url: obj.url || obj.listingUrl || obj.productUrl || obj.href || '',
        quantity: obj.quantity || obj.stock || null
      });
      return;
    }
    Object.entries(obj).forEach(([key, value]) => {
      if (['offers', 'listings', 'prices', 'products', 'items', 'results', 'data'].includes(key)) visit(value, depth + 1);
    });
  };
  roots.forEach(entry => visit(entry));
  return offers;
}

function App() {
  const [number, setNumber] = useState('');
  const [cards, setCards] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [error, setError] = useState('');
  const [offersError, setOffersError] = useState('');
  const [offers, setOffers] = useState([]);
  const [configured, setConfigured] = useState(true);
  const [finish, setFinish] = useState('Todos');
  const selected = cards.find(card => card.id === selectedId) || cards[0];

  async function search(event) {
    event?.preventDefault();
    const input = number.trim();
    const [valuePart, totalPart] = input.split('/');
    const value = valuePart.trim();
    const total = totalPart?.trim();
    if (!value) return;
    setLoading(true); setError(''); setOffers([]); setCards([]); setSelectedId('');
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
    setLoadingOffers(true); setOffersError(''); setOffers([]); setFinish('Todos');
    fetch('/api/liga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selected.name, number: selected.localId, set: selected.set?.name || '' })
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível consultar a Liga Pokémon.');
      if (cancelled) return;
      setConfigured(data.configured !== false);
      setOffers(normalizeOffers(data.items || data.offers || []));
      if (data.configured === false) setOffersError('A busca ao vivo está pronta. Adicione APIFY_TOKEN nas variáveis do projeto Vercel para ativar os preços.');
      else if (!normalizeOffers(data.items || data.offers || []).length) setOffersError('Nenhum anúncio com preço legível retornado para esta impressão. Tente conferir a numeração ou abrir a Liga Pokémon.');
    }).catch(e => { if (!cancelled) setOffersError(e.message || 'Falha ao carregar ofertas.'); })
      .finally(() => { if (!cancelled) setLoadingOffers(false); });
    return () => { cancelled = true; };
  }, [selected?.id]);

  const finishes = useMemo(() => ['Todos', ...new Set(offers.map(offer => offer.finish))], [offers]);
  const visibleOffers = useMemo(() => offers.filter(offer => finish === 'Todos' || offer.finish === finish), [offers, finish]);
  const cheapest = offers.length ? Math.min(...offers.map(offer => offer.price)) : null;
  const ligaUrl = 'https://www.ligapokemon.com.br/';

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Cartalog"><span className="brand-mark"><Layers3 size={19}/></span><span>cart<span className="brand-accent">a</span>log</span></a><span className="top-note"><span className="live-dot"/> POKÉMON TCG · BRASIL</span></header>
    <section className="intro">
      <div className="eyebrow"><Sparkles size={14}/> UM OLHAR MAIS CLARO SOBRE SUA COLEÇÃO</div>
      <h1>Encontre a carta.<br/><em>Descubra o valor.</em></h1>
      <p>Pesquise pela numeração, escolha a impressão e veja ofertas reais da Liga Pokémon em reais.</p>
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
          <div className="metadata"><div><span>COLEÇÃO</span><strong>{selected.set?.name || '—'}</strong></div><div><span>LANÇAMENTO</span><strong>{selected.set?.releaseDate || '—'}</strong></div><div><span>ACABAMENTOS</span><strong>{offers.length ? finishes.length - 1 : 'A verificar'}</strong></div></div>
          <div className="price-heading"><div><CircleDollarSign size={18}/><h3>Ofertas na Liga Pokémon</h3></div><span>VALORES EM REAIS · BRL</span></div>
          <p className="price-caption">Anúncios ativos de vendedores. Os preços podem variar conforme estado, idioma e estoque.</p>
          {loadingOffers && <div className="offer-state"><LoaderCircle className="spin" size={17}/> Consultando anúncios da Liga…</div>}
          {!loadingOffers && offersError && <div className={`offer-state ${configured ? '' : 'setup'}`}>{offersError}</div>}
          {!loadingOffers && offers.length > 0 && <>
            <div className="price-summary"><div><span>MENOR ANÚNCIO</span><strong>{currency.format(cheapest)}</strong></div><div><span>OFERTAS</span><strong>{offers.length}</strong></div><a href={ligaUrl} target="_blank" rel="noreferrer">Abrir Liga <ArrowUpRight size={14}/></a></div>
            <div className="finish-filters" aria-label="Filtrar acabamento">{finishes.map(item => <button type="button" key={item} className={finish === item ? 'active' : ''} onClick={() => setFinish(item)}>{item}</button>)}</div>
            <div className="price-list">{visibleOffers.slice(0, 30).map((offer, index) => <div className="price-row" key={offer.seller + offer.price + index}>
              <span className="price-source"><strong>{offer.finish}</strong><small>{offer.seller}{offer.condition ? ` · ${offer.condition}` : ''}{offer.quantity ? ` · qtd. ${offer.quantity}` : ''}</small></span>
              <span className="offer-value">{currency.format(offer.price)}{offer.url && <a href={offer.url} target="_blank" rel="noreferrer" aria-label="Abrir anúncio"><ArrowUpRight size={13}/></a>}</span>
            </div>)}</div>
            {!visibleOffers.length && <div className="no-prices">Não há ofertas para este acabamento nesta busca.</div>}
          </>}
          {selected.rarity && /art/i.test(selected.rarity) && <div className="full-art-note">Esta impressão é classificada como {selected.rarity}. “Full art” identifica a arte/raridade da impressão; o acabamento foil é informado separadamente nos anúncios.</div>}
          <div className="price-footnote"><a href={ligaUrl} target="_blank" rel="noreferrer">Liga Pokémon <ExternalLink size={12}/></a><span>Preços anunciados, não histórico de vendas.</span></div>
        </article>}
      </div>
    </section>}
    {!loading && !error && cards.length === 0 && <section className="empty-state"><div className="empty-icon"><ImageOff size={22}/></div><strong>Comece pela numeração da carta</strong><span>Encontre a impressão e compare anúncios ativos na Liga Pokémon.</span></section>}
    <footer><span>CATÁLOGO PT-BR VIA TCGDEX · OFERTAS VIA LIGA POKÉMON</span><span>Feito para quem coleciona <span className="footer-star">✳</span></span></footer>
  </main>;
}

export default App;
