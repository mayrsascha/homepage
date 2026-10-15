/* Serves build/ with the headers Netlify would send from build/_headers
   (the CSP, caching), so Lighthouse CI loads the page under its real
   policy: a blocked script or style is a console error, which fails the
   best-practices score. Unknown paths get 404.html with status 404.
   Run: node scripts/serve.ts [port]   (default 5180) */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const ROOT = resolve('build');
const port = Number(process.argv[2] ?? 5180);
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

// _headers: a path line, then indented "Name: value" lines.
const rules: { path: string; headers: Record<string, string> }[] = [];
for (const line of readFileSync(join(ROOT, '_headers'), 'utf8').split('\n')) {
  if (/^\S/.test(line)) rules.push({ path: line.trim(), headers: {} });
  else if (line.trim()) {
    const [name, ...value] = line.trim().split(': ');
    const rule = rules.at(-1);
    if (rule && name) rule.headers[name] = value.join(': ');
  }
}
const headersFor = (path: string) =>
  Object.assign({}, ...rules.filter((r) => r.path === '/*' || r.path === path).map((r) => r.headers));

createServer((req, res) => {
  let path: string;
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  // resolve() also collapses ../ : anything outside build/ is a 404.
  let file = resolve(ROOT, `.${path.endsWith('/') ? `${path}index.html` : path}`);
  let status = 200;
  if (!file.startsWith(ROOT + sep) || !existsSync(file) || !statSync(file).isFile()) {
    file = join(ROOT, '404.html');
    status = 404;
  }
  res.writeHead(status, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', ...headersFor(path) });
  res.end(readFileSync(file));
}).listen(port, 'localhost', () => console.log(`serving build/ with its _headers at http://localhost:${port}/`));
