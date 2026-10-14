/* Build-time sync for the homepage's static content:
   1. Converged markdown markup -> the code block in index.html (byte-identical)
   2. Profile photo files from public/profile.png: the sharp AVIF and the
      placeholder (AVIF + WebP fallback)

   The converged markup started as the highlight.js output of the old React
   runtime; its class names are now shortened (h, s, l, b, e, w; styled in
   src/base.css). To change site content, edit src/Intro.converged.html.

   Run: node scripts/generate.mjs */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

// ---------- 1) Converged markdown markup ----------
const converged = readFileSync('src/Intro.converged.html', 'utf8');

if (!converged.includes('class="h"') || !converged.includes('<h1')) {
  throw new Error('src/Intro.converged.html does not look like the converged markdown markup');
}


// ---------- 2) Profile placeholder (full-res AVIF + half-res WebP, no blur) ----------
// A 24px blurred thumbnail looked like a "ghost" next to the final image —
// too different, so the swap read as a flash. Instead: a HALF-RESOLUTION,
// decent-quality WebP (250px, q10, ~5KB). Same composition as the real
// image, just slightly soft — the swap from placeholder to full-res is
// imperceptible. No blur filter at all. Served as a normal file (tiny
// enough to arrive in the first burst with the HTML).
//
// Primary placeholder is AVIF at FULL resolution (500px, q18, 10-bit, ~4.7KB):
// at the same byte budget AVIF keeps edges and texture that the 250px WebP
// smears (SSIM vs profile.webp: 0.88 vs 0.77). The WebP stays as the
// <picture> fallback for browsers without AVIF (Safari < 16.4).
//
// cwebp/avifenc ship on dev machines (homebrew: webp, libavif) but NOT in the
// Netlify build image — when absent, the committed files are used.
// After changing profile.png locally, commit the regenerated files.
const has = (cmd) => {
  try { execSync(cmd, { stdio: 'ignore' }); return true; }
  catch { return false; }
};
const images = [
  // Real photo: q50 4:4:4 is visually identical to the old 54KB WebP at
  // retina zoom (SSIM 0.975) for 23KB. src/assets/profile.webp (hand-made) stays
  // as the <picture> fallback.
  { out: 'src/assets/profile.avif', probe: 'avifenc --version', pkg: 'libavif',
    cmd: 'avifenc -q 50 --qalpha 60 -s 0 -d 10 --yuv 444 -j 8 public/profile.png src/assets/profile.avif' },
  { out: 'public/profile-lqip.avif', probe: 'avifenc --version', pkg: 'libavif',
    cmd: 'avifenc -q 18 -s 0 -d 10 --yuv 420 -j 8 public/profile.png public/profile-lqip.avif' },
  { out: 'public/profile-lqip.webp', probe: 'cwebp -version', pkg: 'webp',
    cmd: 'cwebp -quiet -resize 250 0 -q 10 public/profile.png -o public/profile-lqip.webp' },
];
for (const p of images) {
  if (has(p.probe)) {
    execSync(p.cmd, { stdio: 'ignore' });
    console.log(`image: regenerated ${p.out} from profile.png`);
  } else if (existsSync(p.out)) {
    console.log(`NOTE: ${p.probe.split(' ')[0]} not available — using committed ${p.out}.`,
      `Regenerate locally (brew install ${p.pkg}) after changing profile.png.`);
  } else {
    throw new Error(`Image not available: ${p.probe.split(' ')[0]} missing and ${p.out} not found`);
  }
}
const placeholderBytes = readFileSync('public/profile-lqip.avif').length;

// ---------- 3) Sync skeleton in index.html ----------
let index = readFileSync('index.html', 'utf8');

// 3a) text block
const openTag = '<div class="Hero"><pre class="md"><code class="md">';
const skeletonStart = index.indexOf(openTag);
if (skeletonStart === -1) throw new Error('Skeleton block not found in index.html');
const contentStart = skeletonStart + openTag.length;
const contentEnd = index.indexOf('</code></pre></div>', contentStart);
if (contentEnd === -1) throw new Error('Skeleton end tag not found');
index = index.slice(0, contentStart) + converged + index.slice(contentEnd);

// 3b) embed the AVIF placeholder as a data URI: it paints with the first
//     HTML bytes (it's the desktop LCP element), no extra request. Base64
//     doesn't gzip, so this adds ~6.3KB; the page stays inside the first
//     network round trip (~14KB).
const lqip = readFileSync('public/profile-lqip.avif').toString('base64');
const lqipRe = /<source srcset="[^"]*" type="image\/avif" \/><img class="profile-placeholder"/;
if (!lqipRe.test(index)) throw new Error('Placeholder <source> not found in index.html');
index = index.replace(lqipRe, () => `<source srcset="data:image/avif;base64,${lqip}" type="image/avif" /><img class="profile-placeholder"`);

// 3c) profile skeleton img: verify the cross-fade stack is present and the
//     placeholder src points at the generated file. The stack markup lives
//     directly in index.html; this check guards against drift.
if (!index.includes('<img class="profile-placeholder" src="/profile-lqip.webp"')) {
  throw new Error('Skeleton profile placeholder img not found (expected /profile-lqip.webp stack)');
}

writeFileSync('index.html', index);

console.log('generate.mjs:',
  'converged', converged.length, 'chars;',
  'placeholder', placeholderBytes, 'bytes (profile-lqip.avif);',
  'index.html synced');