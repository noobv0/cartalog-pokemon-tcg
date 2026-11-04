export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const token = process.env.APIFY_TOKEN;
  if (!token) return res.status(200).json({ configured: false, items: [] });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const name = String(body.name || '').trim().slice(0, 100);
  const number = String(body.number || '').trim().slice(0, 20);
  const set = String(body.set || '').trim().slice(0, 100);
  if (!name || !number) return res.status(400).json({ error: 'Informe o nome e o número da carta.' });

  const url = new URL('https://api.apify.com/v2/acts/gio21~ligapokemon-scraper/run-sync-get-dataset-items');
  url.searchParams.set('token', token);
  const input = {
    query: `${name} ${number} ${set}`.trim(),
    includeOffers: true,
    condition: 'NM',
    language: 'portuguese',
    maxProducts: 1,
    maxItems: 20
  };
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(25000)
    });
    if (!upstream.ok) return res.status(502).json({ error: 'O serviço da Liga não respondeu. Tente novamente mais tarde.' });
    const items = await upstream.json();
    return res.status(200).json({ configured: true, source: 'Liga Pokémon', currency: 'BRL', scrapedAt: new Date().toISOString(), items });
  } catch {
    return res.status(502).json({ error: 'Não foi possível consultar a Liga Pokémon neste momento.' });
  }
}
