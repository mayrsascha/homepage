/* One-off helper: strips whitespace-only text nodes inside #root so the
   skeleton DOM equals React's hydration tree (React #418 otherwise).
   Kept as a script because it must re-run if index.html is ever re-indented.
   Run: node scripts/strip-root-ws.mjs */
import { readFileSync, writeFileSync } from 'fs';

let html = readFileSync('index.html', 'utf8');
const rootStart = html.indexOf('<div id="root">');
if (rootStart === -1) throw new Error('#root not found');
const scriptMarker = html.indexOf('<script>', rootStart);
if (scriptMarker === -1) throw new Error('script after #root not found');
const root = html.slice(rootStart, scriptMarker);

// Split into tags and text; drop whitespace-only text nodes — except inside
// <pre>, where whitespace is rendered content (and must equal the converged
// markup byte-for-byte; see scripts/verify-skeleton.mjs).
const parts = root.split(/(<[^>]*>)/);
const kept = [];
let preDepth = 0;
for (const p of parts) {
  if (p.startsWith('<')) {
    if (/^<pre[\s>]/.test(p)) preDepth++;
    else if (p.startsWith('</pre')) preDepth--;
    kept.push(p);
    continue;
  }
  if (preDepth === 0 && /^\s*$/.test(p)) continue; // whitespace-only text node — drop
  kept.push(p);
}

html = html.slice(0, rootStart) + kept.join('') + '\n    ' + html.slice(scriptMarker);
writeFileSync('index.html', html);
console.log('stripped whitespace-only text nodes inside #root');