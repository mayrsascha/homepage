/* Build-time sync for the homepage's static content:
   1. Converged markdown markup -> the code block in index.html (byte-identical)
   2. Profile photo files from src/assets/profile.png: the real photo at three
      widths (AVIF + WebP fallback) and the placeholder (AVIF + WebP fallback)

   The converged markup started as the highlight.js output of the old React
   runtime; its class names are now shortened (h, s, l, b, e, w; styled in
   src/style.css). To change site content, edit src/Intro.converged.html.

   Run: node scripts/generate.mjs */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
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
// Primary placeholder is AVIF at the base resolution (500px, q18, 10-bit, ~4.7KB):
// at the same byte budget AVIF keeps edges and texture that the 250px WebP
// smears (SSIM vs the real photo: 0.88 vs 0.77). The WebP stays as the
// <picture> fallback for browsers without AVIF (Safari < 16.4).
//
// cwebp/avifenc ship on dev machines (homebrew: webp, libavif) but NOT in the
// Netlify build image — when absent, the committed files are used.
// After changing profile.png locally, commit the regenerated files.
const has = (cmd) => {
  try { execSync(cmd, { stdio: 'ignore' }); return true; }
  catch { return false; }
};
// The source photo is 1280x1920. The real photo ships at three widths
// (srcset in index.html) so big and high-DPI screens get a sharp image and
// phones a small one. avifenc can't resize, so sips (macOS) scales the
// source first. q50 4:4:4 AVIF: ~20 / 48 / 120 KB.
const tmp = (w) => join(tmpdir(), `homepage-profile-${w}.png`);
const avif = (w) => ({ out: `src/assets/profile-${w}.avif`, probe: 'avifenc --version && sips --help', pkg: 'libavif',
  cmd: `sips -Z ${w * 3 / 2} src/assets/profile.png --out ${tmp(w)} && avifenc -q 50 --qalpha 60 -s 0 -d 10 --yuv 444 -j 8 ${tmp(w)} src/assets/profile-${w}.avif` });
const webp = (w) => ({ out: `src/assets/profile-${w}.webp`, probe: 'cwebp -version', pkg: 'webp',
  cmd: `cwebp -quiet -resize ${w} 0 -q 75 -alpha_q 80 src/assets/profile.png -o src/assets/profile-${w}.webp` });
const images = [
  ...[500, 800, 1280].flatMap((w) => [avif(w), webp(w)]),
  // Placeholders: from the 500px scale, the size the photo shows at on a
  // typical laptop.
  { out: 'src/assets/profile-lqip.avif', probe: 'avifenc --version && sips --help', pkg: 'libavif',
    cmd: `sips -Z 750 src/assets/profile.png --out ${tmp(500)} && avifenc -q 18 -s 0 -d 10 --yuv 420 -j 8 ${tmp(500)} src/assets/profile-lqip.avif` },
  { out: 'public/profile-lqip.webp', probe: 'cwebp -version', pkg: 'webp',
    cmd: 'cwebp -quiet -resize 250 0 -q 10 src/assets/profile.png -o public/profile-lqip.webp' },
];
// Encoding all of them takes ~15s, so skip it when neither profile.png nor
// the commands changed since the committed files were made (the stamp file
// records both). `node scripts/generate.mjs --force` re-encodes anyway.
const STAMP = 'src/assets/profile.stamp';
const stamp = createHash('sha256')
  .update(readFileSync('src/assets/profile.png'))
  .update(JSON.stringify(images.map((p) => p.cmd)))
  .digest('hex');
const upToDate = !process.argv.includes('--force')
  && existsSync(STAMP) && readFileSync(STAMP, 'utf8').trim() === stamp
  && images.every((p) => existsSync(p.out));
if (upToDate) console.log('images: up to date with profile.png (stamp matches), not re-encoded');
let encoded = false;
for (const p of upToDate ? [] : images) {
  if (has(p.probe)) {
    encoded = true;
    execSync(p.cmd, { stdio: 'ignore' });
    console.log(`image: regenerated ${p.out} from profile.png`);
  } else if (existsSync(p.out)) {
    console.log(`NOTE: ${p.probe.split(' ')[0]} not available — using committed ${p.out}.`,
      `Regenerate locally (brew install ${p.pkg}) after changing profile.png.`);
  } else {
    throw new Error(`Image not available: ${p.probe.split(' ')[0]} missing and ${p.out} not found`);
  }
}
if (encoded) writeFileSync(STAMP, stamp + '\n');
const placeholderBytes = readFileSync('src/assets/profile-lqip.avif').length;

// ---------- 3) Sync skeleton in index.html ----------
let index = readFileSync('index.html', 'utf8');

// 3a) text block
const openTag = '<div class="Hero"><div class="md md-pre"><div class="md md-code">';
const skeletonStart = index.indexOf(openTag);
if (skeletonStart === -1) throw new Error('Skeleton block not found in index.html');
const contentStart = skeletonStart + openTag.length;
const contentEnd = index.indexOf('</div></div></div><div class="profile">', contentStart);
if (contentEnd === -1) throw new Error('Skeleton end tag not found');
index = index.slice(0, contentStart) + converged + index.slice(contentEnd);

// 3b) embed the AVIF placeholder as a data URI: it paints with the first
//     HTML bytes (it's the desktop LCP element), no extra request. Base64
//     doesn't gzip, so this adds ~6.3KB; the page stays inside the first
//     network round trip (~14KB).
const lqip = readFileSync('src/assets/profile-lqip.avif').toString('base64');
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