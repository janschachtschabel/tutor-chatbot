// Vercel Serverless proxy for WirLernenOnline (edu-sharing) API
// Path: /api/edu-sharing/* -> https://redaktion.openeduhub.net/edu-sharing/*

export default async function handler(req, res) {
  try {
    const segments = Array.isArray(req.query.endpoint)
      ? req.query.endpoint
      : [req.query.endpoint].filter(Boolean);

    const targetUrl = `https://redaktion.openeduhub.net/edu-sharing/${segments.join('/')}`;

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.status(204).end();
      return;
    }

    const body = await getRawBody(req);

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Accept': 'application/json'
      },
      body: shouldHaveBody(req.method) ? body : undefined
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);

    res.send(text);
  } catch (err) {
    console.error('edu-sharing proxy error:', err);
    res.status(500).json({ error: 'edu-sharing proxy failed', details: err?.message || String(err) });
  }
}

function shouldHaveBody(method) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase());
}

function getRawBody(req) {
  return new Promise((resolve) => {
    try {
      if (typeof req.body === 'string') return resolve(req.body);
      if (req.body && typeof req.body === 'object') return resolve(JSON.stringify(req.body));
    } catch {}
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data || undefined));
  });
}
