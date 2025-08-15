// Minimal API server to satisfy Docker/Nginx reverse proxy in production image
// Provides /api/health and placeholder endpoints used by frontend (translation is handled by electron in desktop mode)

import http from 'node:http';
import url from 'node:url';

const PORT = Number(process.env.PORT || 3001);

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || '', true);
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (parsed.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('healthy\n');
    return;
  }

  if (parsed.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Placeholder: readable fetch proxy (can be extended in web deployment)
  if (parsed.pathname === '/api/fetch-readable' && req.method === 'POST') {
    try {
      let body = '';
      req.on('data', (c) => (body += c));
      await new Promise((r) => req.on('end', r));
      const { url: target } = JSON.parse(body || '{}');
      if (!target) throw new Error('missing url');
      const resp = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0 ChatLLM' } });
      const html = await resp.text();
      const content = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, content }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(e?.message || e) }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, message: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`API server listening on :${PORT}`);
});


