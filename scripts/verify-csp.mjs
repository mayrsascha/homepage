/* Check the built pages against the CSP the build wrote: every inline
   <script> and <style> in build/*.html must have its SHA-256 hash in
   build/_headers, or the browser blocks it in production (where the policy
   applies; local previews and Lighthouse CI don't send it).
   Run after `vite build` (pnpm build does). */
import { readFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';

const policy = readFileSync('build/_headers', 'utf8').match(/Content-Security-Policy: (.*)/)?.[1];
if (!policy) throw new Error('No Content-Security-Policy in build/_headers');
const allowed = (directive) => new Set(policy.match(new RegExp(`${directive} ([^;]*)`))?.[1].split(' ') ?? []);
const scripts = allowed('script-src');
const styles = allowed('style-src');
const hash = (code) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`;

let checked = 0;
const missing = [];
for (const file of readdirSync('build').filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(`build/${file}`, 'utf8');
  if (/\sstyle="/.test(html)) missing.push(`${file}: style="" attribute (needs 'unsafe-hashes')`);
  for (const [, attrs, code] of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (/\ssrc=|application\/ld\+json/.test(attrs ?? '')) continue;
    checked++;
    if (!scripts.has(hash(code))) missing.push(`${file}: inline script ${hash(code)}`);
  }
  for (const [, code] of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    checked++;
    if (!styles.has(hash(code))) missing.push(`${file}: inline style ${hash(code)}`);
  }
}
if (missing.length) {
  console.error('CSP would block:\n  ' + missing.join('\n  '));
  process.exit(1);
}
console.log(`verify-csp: ${checked} inline scripts/styles, all allowed by build/_headers`);
