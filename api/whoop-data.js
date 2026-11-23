// Proxies GET requests to the WHOOP API. Tries v2 first, falls back to v1 on 404.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing bearer token' });
  const path = (req.query && req.query.path) || '';
  if (!path || !path.startsWith('/') || path.includes('..')) return res.status(400).json({ error: 'path required' });
  const fwd = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query || {})) if (k !== 'path') fwd.set(k, String(v));
  const qs = fwd.toString();
  const get = (base) => fetch(base + path + (qs ? '?' + qs : ''), {
    headers: { Authorization: auth, Accept: 'application/json' },
  });
  try {
    let r = await get('https://api.prod.whoop.com/developer/v2');
    if (r.status === 404) r = await get('https://api.prod.whoop.com/developer/v1');
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: 'proxy fetch failed: ' + (e.message || String(e)) });
  }
}
