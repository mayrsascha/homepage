/* Checks the build can't make on its own. Run after `vite build` (pnpm build
   does):
   1. CSP: every inline <script> and <style> in build/*.html must have its
      SHA-256 hash in build/_headers, or the browser blocks it in production
      (local previews and Lighthouse CI don't send the policy). Nothing may
      be external: the policy allows no stylesheet or script files.
   2. Theme copies: the colours and the storage key, written by hand where
      src/style.css can't reach (the noscript style, the inline scripts, the
      theme-color tags, src/main.ts, 404.html), must match src/style.css. */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const problems: string[] = [];

// ---------- 1) CSP ----------
const policy = readFileSync('build/_headers', 'utf8').match(/Content-Security-Policy: (.*)/)?.[1];
if (!policy) throw new Error('No Content-Security-Policy in build/_headers');
const allowed = (directive: string) => new Set(policy.match(new RegExp(`${directive} ([^;]*)`))?.[1].split(' ') ?? []);
const scripts = allowed('script-src');
const styles = allowed('style-src');
const hash = (code: string) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`;

let checked = 0;
for (const file of readdirSync('build').filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(`build/${file}`, 'utf8');
  if (/\sstyle="/.test(html)) problems.push(`${file}: style="" attribute (needs 'unsafe-hashes')`);
  if (/<link[^>]+rel="?stylesheet/.test(html)) problems.push(`${file}: external stylesheet (not inlined)`);
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

// ---------- 2) Theme copies ----------
const css = readFileSync('src/style.css', 'utf8');
const palette = (block = ''): Record<string, string> =>
  Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
const light = palette(css.match(/:root \{([^}]*)\}/)?.[1]);
const dark = palette(css.match(/html\.js-dark \{([^}]*)\}/)?.[1]);
if (!light.bg || !dark.bg) throw new Error('Theme palettes not found in src/style.css');
const sources: Record<string, string> = {
  'index.html': readFileSync('index.html', 'utf8'),
  '404.html': readFileSync('404.html', 'utf8'),
  'src/main.ts': readFileSync('src/main.ts', 'utf8'),
};
for (const [file, text] of Object.entries(sources)) {
  // Every theme variable written elsewhere carries the light or dark value.
  for (const [, name, value] of text.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)) {
    if (value !== light[name] && value !== dark[name])
      problems.push(`${file}: --${name}:${value} matches neither theme in src/style.css`);
  }
  // Bare colours (theme-color tags and scripts) are one of the backgrounds.
  for (const [, value] of text.replace(/--[\w-]+:\s*#[0-9a-f]{6}/g, '').matchAll(/(#[0-9a-f]{6})\b/g)) {
    if (value !== light.bg && value !== dark.bg)
      problems.push(`${file}: colour ${value} is neither theme's background`);
  }
}
const KEY = sources['src/main.ts'].match(/const KEY = '([^']+)'/)?.[1];
for (const file of ['index.html', '404.html']) {
  for (const [, key] of sources[file].matchAll(/localStorage\.getItem\('([^']+)'\)/g)) {
    if (key !== KEY) problems.push(`${file}: storage key '${key}', src/main.ts uses '${KEY}'`);
  }
}

if (problems.length) {
  console.error(`verify-build failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`verify-build: ${checked} inline scripts/styles allowed by the CSP; theme copies match src/style.css`);
