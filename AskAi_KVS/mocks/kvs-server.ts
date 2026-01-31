/**
 * Mock KVS Server for Local Development
 *
 * An in-memory key-value store that simulates the KVS Lambda endpoint.
 * Run with: npx tsx mocks/kvs-server.ts
 */

import http from 'http';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 9000;
const store = new Map<string, unknown>();

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  const method = req.method || 'GET';

  // Parse key from URL
  const key = decodeURIComponent(url.slice(1)); // Remove leading /

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`${new Date().toISOString()} ${method} /${key}`);

  if (method === 'GET') {
    const value = store.get(key);
    if (value === undefined) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    }
    return;
  }

  if (method === 'PUT' || method === 'POST' || method === 'PATCH') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const value = JSON.parse(body);

        if (method === 'POST' && store.has(key)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Key already exists' }));
          return;
        }

        if (method === 'PATCH') {
          const existing = store.get(key);
          if (existing === undefined) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }
          if (typeof existing === 'object' && existing !== null) {
            store.set(key, { ...(existing as Record<string, unknown>), ...value });
          } else {
            store.set(key, value);
          }
        } else {
          store.set(key, value);
        }

        console.log(`  -> Stored (${typeof value})`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (method === 'DELETE') {
    store.delete(key);
    console.log(`  -> Deleted`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    Mock KVS Server                        ║
╠═══════════════════════════════════════════════════════════╣
║  Running at: http://localhost:${PORT.toString().padEnd(5)}                     ║
║                                                           ║
║  Supported Methods:                                       ║
║    GET    /{key}  - Retrieve value                        ║
║    PUT    /{key}  - Create or replace                     ║
║    POST   /{key}  - Create only (fail if exists)          ║
║    PATCH  /{key}  - Partial update                        ║
║    DELETE /{key}  - Remove key                            ║
║                                                           ║
║  Storage: In-memory (resets on restart)                   ║
╚═══════════════════════════════════════════════════════════╝
`);
});
