/* Checks the build can't make on its own. Run after `vite build` (pnpm build
   does):
   1. Headers: _headers sets the security headers on every path, and every inline <script> and <style> in build/*.html must have its
      SHA-256 hash in build/_headers, or the browser blocks it in production
      (Vite's preview doesn't send the policy; scripts/serve.ts and so
      Lighthouse CI do). Nothing may be external, and no style attributes,
      event handlers or javascript: URLs: the policy allows none of them.
   2. Theme copies: the colours and the storage key, written by hand where
      src/style.css can't reach (the noscript style, the inline scripts, the
      theme-color tags, src/main.ts, 404.html), must match src/style.css. */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const problems: string[] = [];

// ---------- 1) CSP ----------
const headers = readFileSync('build/_headers', 'utf8');
const policy = headers.match(/Content-Security-Policy: (.*)/)?.[1];
if (!policy) throw new Error('No Content-Security-Policy in build/_headers');
const allowed = (directive: string) => new Set(policy.match(new RegExp(`${directive} ([^;]*)`))?.[1].split(' ') ?? []);
const scripts = allowed('script-src');
const styles = allowed('style-src');
const hash = (code: string) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`;

let checked = 0;
for (const file of readdirSync('build').filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(`build/${file}`, 'utf8');
  // Attributes the hash-only policy blocks: style="", on*="" handlers,
  // javascript: URLs (all would need 'unsafe-hashes' or 'unsafe-inline').
  for (const [tag] of html.matchAll(/<[a-z](?:"[^"]*"|'[^']*'|[^'">])*>/gi)) {
    if (/\sstyle\s*=/i.test(tag)) problems.push(`${file}: style attribute in ${tag.slice(0, 60)}`);
    if (/\son[a-z]+\s*=/i.test(tag)) problems.push(`${file}: inline event handler in ${tag.slice(0, 60)}`);
    if (/\s(?:href|src|action|formaction)\s*=\s*["']?\s*javascript:/i.test(tag))
      problems.push(`${file}: javascript: URL in ${tag.slice(0, 60)}`);
  }
  if (/<link[^>]+rel=["']?stylesheet/.test(html)) problems.push(`${file}: external stylesheet (not inlined)`);
  for (const [tag] of html.matchAll(/<script[^>]*\ssrc=[^>]*>/g)) problems.push(`${file}: external script ${tag}`);
  for (const [tag] of html.matchAll(/<style\s[^>]*>/g)) problems.push(`${file}: <style> with attributes ${tag}`);
  for (const [, attrs, code] of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (/\ssrc=|application\/ld\+json/.test(attrs ?? '')) continue;
    checked++;
    if (!scripts.has(hash(code))) problems.push(`${file}: inline script ${hash(code)} not in the CSP`);
  }
  for (const [, code] of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    checked++;
    if (!styles.has(hash(code))) problems.push(`${file}: inline style ${hash(code)} not in the CSP`);
  }
}

// The security headers on every path (the /* block of _headers).
const site = headers.match(/^\/\*\n((?: {2}.*\n)*)/)?.[1] ?? '';
const REQUIRED: [string, (value: string) => boolean][] = [
  // HSTS preload needs at least a year, includeSubDomains and preload.
  [
    'Strict-Transport-Security',
    (v) => /; includeSubDomains; preload$/.test(v) && Number(v.match(/^max-age=(\d+)/)?.[1]) >= 31536000,
  ],
  ['X-Content-Type-Options', (v) => v === 'nosniff'],
  ['X-Frame-Options', (v) => v === 'DENY'],
  ['Cross-Origin-Opener-Policy', (v) => v === 'same-origin'],
  ['Referrer-Policy', (v) => v === 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', (v) => v === 'camera=(), microphone=(), geolocation=()'],
  [
    'Content-Security-Policy',
    (v) =>
      v.replace(/ 'sha256-[A-Za-z0-9+/]+=*'/g, '') ===
      "default-src 'none'; script-src; style-src; img-src 'self' data:; connect-src 'self'; base-uri 'none'; " +
        "form-action 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types 'none'",
  ],
];
for (const [name, ok] of REQUIRED) {
  const value = site.match(new RegExp(`^ {2}${name}: (.*)$`, 'm'))?.[1];
  if (!value || !ok(value)) problems.push(`_headers /*: ${name} is ${value ?? 'missing'}`);
}

// ---------- 2) Theme copies ----------
// Hex colours compared lower-case, 3-digit ones expanded.
const hex = (value: string) =>
  (value.length === 4 ? `#${[...value.slice(1)].map((c) => c + c).join('')}` : value).toLowerCase();
const COLOUR = /(?<![\w&/])#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const palette = (block = ''): Record<string, string> =>
  Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})\b/gi)].map((m) => [m[1], hex(m[2])]));
const css = readFileSync('src/style.css', 'utf8');
const light = palette(css.match(/:root \{([^}]*)\}/)?.[1]);
const dark = palette(css.match(/html\.js-dark \{([^}]*)\}/)?.[1]);
if (!light.bg || !dark.bg) throw new Error('Theme palettes not found in src/style.css');
const sources: Record<string, string> = {
  'index.html': readFileSync('index.html', 'utf8'),
  '404.html': readFileSync('404.html', 'utf8'),
  'src/main.ts': readFileSync('src/main.ts', 'utf8'),
};
// Palette blocks: every CSS block that sets --bg is one theme, complete.
const blocks: Record<string, number> = { 'index.html': 1, '404.html': 3, 'src/main.ts': 0 };
for (const [file, text] of Object.entries(sources)) {
  const found = [...text.matchAll(/\{([^{}]*--bg:[^{}]*)\}/g)];
  if (found.length !== blocks[file]) problems.push(`${file}: ${found.length} theme blocks, expected ${blocks[file]}`);
  for (const m of found) {
    const values = palette(m[1]);
    // The block's selector (back to the previous rule or tag) says which theme it is.
    const isDark = /dark/.test(text.slice(0, m.index).split(/[>}]/).at(-1) ?? '');
    const theme = isDark ? dark : light;
    const name = isDark ? 'dark' : 'light';
    // Colours in the block other than the theme variables aren't checked copies.
    for (const [value] of m[1].replace(/--[\w-]+:\s*#[0-9a-f]{3,6}\b/gi, '').matchAll(COLOUR))
      problems.push(`${file}: colour ${value} in a ${name} theme block`);
    for (const [key, want] of Object.entries(theme)) {
      if (values[key] !== want)
        problems.push(`${file}: ${name} block has --${key}:${values[key] ?? '(missing)'}, not ${want}`);
    }
  }
  // theme-color tags: the background of the theme their media query names.
  const schemes: string[] = [];
  for (const [tag] of text.matchAll(/<meta name="theme-color"[^>]*>/gi)) {
    const value = tag.match(/content="(#[0-9a-f]{3,6})"/i)?.[1];
    const scheme = tag.match(/media="\(prefers-color-scheme:\s*(light|dark)\)"/i)?.[1];
    if (!value || !scheme) {
      problems.push(`${file}: theme-color tag not understood: ${tag}`);
      continue;
    }
    schemes.push(scheme);
    const want = scheme === 'dark' ? dark.bg : light.bg;
    if (hex(value) !== want) problems.push(`${file}: ${scheme} theme-color is ${value}, not ${want}`);
  }
  if (file === 'index.html' && schemes.sort().join() !== 'dark,light')
    problems.push(`index.html: theme-color tags for ${schemes.join(', ') || 'nothing'}, expected light and dark`);
  // Scripts: `dark ? <dark bg> : <light bg>`.
  for (const [, a, b] of text.matchAll(/dark \? '(#[0-9a-f]{3,6})' : '(#[0-9a-f]{3,6})'/gi)) {
    if (hex(a) !== dark.bg || hex(b) !== light.bg)
      problems.push(`${file}: theme-color script sets ${a} / ${b}, not ${dark.bg} / ${light.bg}`);
  }
  // Nothing else: any other colour in these files is a copy this check doesn't know.
  const rest = text
    .replace(/\{[^{}]*--bg:[^{}]*\}/g, '')
    .replace(/<meta name="theme-color"[^>]*>/gi, '')
    .replace(/dark \? '#[0-9a-f]{3,6}' : '#[0-9a-f]{3,6}'/gi, '')
    .replace(/data:[^"')\s]*/g, '');
  for (const [value] of rest.matchAll(COLOUR))
    problems.push(`${file}: colour ${value} outside the checked theme copies`);
}
for (const file of ['index.html', 'src/main.ts']) {
  if (!/dark \? '#/.test(sources[file])) problems.push(`${file}: theme-color script not found`);
}
if ((sources['index.html'].match(/<meta name="theme-color"/g) ?? []).length !== 2)
  problems.push('index.html: expected 2 theme-color tags (light, dark)');
const KEY = sources['src/main.ts'].match(/const KEY = '([^']+)'/)?.[1];
for (const file of ['index.html', '404.html']) {
  const keys = [...sources[file].matchAll(/localStorage\.getItem\('([^']+)'\)/g)].map((m) => m[1]);
  if (!keys.length) problems.push(`${file}: no localStorage.getItem found`);
  for (const key of keys) if (key !== KEY) problems.push(`${file}: storage key '${key}', src/main.ts uses '${KEY}'`);
}

if (problems.length) {
  console.error(`verify-build failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`verify-build: ${checked} inline scripts/styles allowed by the CSP; theme copies match src/style.css`);
