/* Build-time sync for the homepage's static content:
   1. Converged hljs markup -> the code block in index.html (byte-identical)
   2. Half-res placeholder for the profile photo (public/profile-lqip.webp)

   The converged markup is the exact hljs output the old runtime produced
   (extracted once from the live DOM). To change site content, edit
   src/Intro.converged.html directly (or re-derive via browser + hljs).

   The LQIP is a ~25px blurred WebP of public/profile.png, base64-inlined
   (<1KB) so first paint shows a blurry version of the real photo instead
   of an empty box. Regenerates automatically from the source image when
   cwebp is available (local dev); on CI without cwebp (Netlify) it reuses
   the committed src/ProfileLqip.b64 so the build never breaks.
   After changing profile.png locally, commit the updated ProfileLqip.b64.

   Run: node scripts/generate.mjs */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

// ---------- 1) Converged hljs markup ----------
const converged = readFileSync('src/Intro.converged.html', 'utf8');

if (!converged.includes('hljs-section') || !converged.includes('<h1>')) {
  throw new Error('src/Intro.converged.html does not look like converged hljs markup');
}


// ---------- 2) Profile placeholder (mid-res WebP, no blur) ----------
// A 24px blurred thumbnail looked like a "ghost" next to the final image —
// too different, so the swap read as a flash. Instead: a HALF-RESOLUTION,
// decent-quality WebP (250px, q10, ~5KB). Same composition as the real
// image, just slightly soft — the swap from placeholder to full-res is
// imperceptible. No blur filter at all. Served as a normal file (tiny
// enough to arrive in the first burst with the HTML).
//
// cwebp ships on dev machines (homebrew) but NOT in the Netlify build
// image — when absent, the committed public/profile-lqip.webp is used.
// After changing profile.png locally, commit the regenerated file.
const cwebpAvailable = (() => {
  try { execSync('cwebp -version', { stdio: 'ignore' }); return true; }
  catch { return false; }
})();

if (cwebpAvailable) {
  execSync('cwebp -quiet -resize 250 0 -q 10 public/profile.png -o public/profile-lqip.webp');
  console.log('placeholder: regenerated public/profile-lqip.webp from profile.png');
} else if (existsSync('public/profile-lqip.webp')) {
  console.log('NOTE: cwebp not available — using committed public/profile-lqip.webp.',
    'Regenerate locally (brew install webp) after changing profile.png.');
} else {
  throw new Error('No placeholder available: cwebp missing and public/profile-lqip.webp not found');
}
const placeholderBytes = readFileSync('public/profile-lqip.webp').length;

// ---------- 3) Sync skeleton in index.html ----------
let index = readFileSync('index.html', 'utf8');

// 3a) text block
const openTag = '<div class="Hero"><pre class="markdown hljs"><code class="markdown hljs">';
const skeletonStart = index.indexOf(openTag);
if (skeletonStart === -1) throw new Error('Skeleton block not found in index.html');
const contentStart = skeletonStart + openTag.length;
const contentEnd = index.indexOf('</code></pre></div>', contentStart);
if (contentEnd === -1) throw new Error('Skeleton end tag not found');
index = index.slice(0, contentStart) + converged + index.slice(contentEnd);

// 3b) profile skeleton img: verify the cross-fade stack is present and the
//     placeholder src points at the generated file. The stack markup lives
//     directly in index.html; this check guards against drift.
if (!index.includes('<img class="profile-placeholder" src="/profile-lqip.webp"')) {
  throw new Error('Skeleton profile placeholder img not found (expected /profile-lqip.webp stack)');
}

writeFileSync('index.html', index);

console.log('generate.mjs:',
  'converged', converged.length, 'chars;',
  'placeholder', placeholderBytes, 'bytes (profile-lqip.webp);',
  'index.html synced');