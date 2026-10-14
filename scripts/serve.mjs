/* Serves build/ with the headers Netlify would send from build/_headers
   (the CSP, caching), so Lighthouse CI loads the page under its real
   policy: a blocked script or style is a console error, which fails the
   best-practices score. Unknown paths get 404.html with status 404.
   Run: node scripts/serve.mjs [port]   (default 5180) */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = 'build';
const port = Number(process.argv[2] ?? 5180);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
};

// _headers: a path line, then indented "Name: value" lines.
const rules = [];
for (const line of readFileSync(join(ROOT, '_headers'), 'utf8').split('\n')) {
  if (/^\S/.test(line)) rules.push({ path: line.trim(), headers: {} });
  else if (line.trim()) {
    const [name, ...value] = line.trim().split(': ');
    rules.at(-1).headers[name] = value.join(': ');
  }
}
const headersFor = (path) => Object.assign({}, ...rules.filter((r) => r.path === '/*' || r.path === path).map((r) => r.headers));

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  let file = normalize(join(ROOT, path.endsWith('/') ? `${path}index.html` : path));
  let status = 200;
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) { file = join(ROOT, '404.html'); status = 404; }
  res.writeHead(status, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', ...headersFor(path) });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`serving ${ROOT}/ with its _headers at http://localhost:${port}/`));
