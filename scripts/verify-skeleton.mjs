/* Verify skeleton pre content matches Intro.converged.html byte-for-byte.
   Run: node scripts/verify-skeleton.mjs */
import { readFileSync } from 'fs';

const html = readFileSync('index.html', 'utf8');
const start = html.indexOf('<code class="markdown hljs">') + '<code class="markdown hljs">'.length;
const end = html.indexOf('</code></pre></div>', start);
const skeleton = html.slice(start, end);
// No trimming: React renders the file verbatim (incl. trailing newline).
const converged = readFileSync('src/Intro.converged.html', 'utf8');

if (skeleton === converged) {
  console.log('OK: skeleton pre content is byte-identical to converged markup');
  process.exit(0);
} else {
  console.error('MISMATCH: skeleton', skeleton.length, 'chars vs converged', converged.length, 'chars');
  for (let i = 0; i < Math.min(skeleton.length, converged.length); i++) {
    if (skeleton[i] !== converged[i]) {
      console.error('first diff at', i);
      console.error('skeleton:', JSON.stringify(skeleton.slice(Math.max(0, i - 20), i + 20)));
      console.error('converged:', JSON.stringify(converged.slice(Math.max(0, i - 20), i + 20)));
      break;
    }
  }
  process.exit(1);
}