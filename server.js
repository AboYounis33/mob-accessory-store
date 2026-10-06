import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp' };
const resolvePath = (requestPath) => { const normalized = normalize(requestPath === '/' ? '/index.html' : requestPath).replace(/^\.\.(\/|\\)/, ''); const publicFile = normalized === '/manus-routes.json' || normalized.startsWith('/brand-mark.') ? join(root, 'public', normalized) : join(root, normalized); return normalized === '/admin' ? join(root, 'admin.html') : publicFile; };
const server = http.createServer(async (req, res) => { const requestPath = decodeURIComponent((req.url || '/').split('?')[0]); if (requestPath === '/health') { res.writeHead(200, { 'content-type':'text/plain' }); res.end('ok'); return; } const filePath = resolvePath(requestPath); try { const body = await readFile(filePath); res.writeHead(200, { 'content-type': types[extname(filePath)] || 'application/octet-stream', 'cache-control':'no-cache' }); res.end(body); } catch { res.writeHead(404, { 'content-type':'text/plain; charset=utf-8' }); res.end('Not found'); } });
server.listen(port, '0.0.0.0', () => console.log(`موب أكسسوار running on http://0.0.0.0:${port}`));
