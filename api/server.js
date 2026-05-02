import server from '../dist/server/server.js';

// Adapts TanStack Start's Web Fetch handler to Vercel's Node.js serverless format
export default async function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] ?? 'https';
  const host = req.headers.host;
  const url = `${protocol}://${host}${req.url}`;

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value != null) headers[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body: body?.length ? body : undefined,
  });

  const response = await server.fetch(request);

  res.status(response.status);
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }

  res.end(Buffer.from(await response.arrayBuffer()));
}
