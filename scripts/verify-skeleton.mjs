/* Verify the skeleton's text block matches Intro.converged.html byte-for-byte.
   Run: node scripts/verify-skeleton.mjs */
import { readFileSync } from 'fs';

const html = readFileSync('index.html', 'utf8');
const open = '<div class="md md-code">';
const start = html.indexOf(open) + open.length;
const end = html.indexOf('</div></div></div><div class="profile">', start);
const skeleton = html.slice(start, end);
// No trimming: generate.mjs writes the file verbatim (incl. trailing newline).
const converged = readFileSync('src/Intro.converged.html', 'utf8');

if (skeleton === converged) {
  console.log('OK: skeleton text block is byte-identical to converged markup');
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