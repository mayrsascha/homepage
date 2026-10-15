/* Build-time sync for the homepage's static content:
   1. Check src/Intro.converged.html (the converged markdown markup)
   2. Profile photo files from src/assets/profile.png: the real photo at three
      widths (AVIF + WebP fallback) and the placeholder (AVIF + WebP fallback)
   3. Sync index.html: the markup into the code block (byte-identical), the
      AVIF placeholder as a data URI, and the photo's srcset/sizes
   4. The engineering page: src/how-its-built.md -> how-its-built/index.html

   The converged markup started as the highlight.js output of the old React
   runtime; its class names are now shortened (h, s, l, b, e, w; styled in
   src/style.css). To change site content, edit src/Intro.converged.html.

   Run: node scripts/generate.ts */

import { execFileSync, type StdioOptions } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ---------- 1) Converged markdown markup ----------
const converged = readFileSync('src/Intro.converged.html', 'utf8');

if (!converged.includes('class="h"') || !converged.includes('<h1')) {
  throw new Error('src/Intro.converged.html does not look like the converged markdown markup');
}

// ---------- 2) Profile photo and placeholder ----------
// The placeholder is the photo itself at low quality, not a blurred
// thumbnail (that read as a "ghost", and the swap as a flash): AVIF at
// 500px (q18, 10-bit, ~4.4KB; alpha at q25, not q18: fewer faint blocks
// around the edges for ~180 bytes), embedded in index.html. The fallback
// for browsers without AVIF (Safari < 16.4) is a half-resolution WebP
// (250px, q10, ~4.4KB) served as a file: at the same size AVIF keeps the
// edges and texture the WebP smears (SSIM vs the real photo: 0.88 vs 0.77).
//
// cwebp/avifenc ship on dev machines (homebrew: webp, libavif) but NOT in the
// Netlify build image — when absent, the committed files are used.
// After changing profile.png locally, commit the regenerated files.
type Command = [bin: string, ...args: string[]];
type Image = { out: string; probe: Command[]; pkg: string; steps: Command[]; tmp?: string };
const run = ([bin, ...args]: Command, stdio: StdioOptions) => execFileSync(bin, args, { stdio });
const has = (steps: Command[]) => {
  try {
    for (const step of steps) run(step, 'ignore');
    return true;
  } catch {
    return false;
  }
};
// The source photo is 1280x1920. The real photo ships at three widths
// (srcset in index.html) so big and high-DPI screens get a sharp image and
// phones a small one. avifenc can't resize, so sips (macOS) scales the
// source first. q50 4:4:4 AVIF: ~20 / 48 / 120 KB.
// Each image is a list of commands (argument arrays, no shell); `tmp` is a
// scaled copy that avifenc encodes and that is deleted afterwards.
const tmp = (w: number) => join(tmpdir(), `homepage-profile-${w}.png`);
const AVIF_PROBE: Command[] = [
  ['avifenc', '--version'],
  ['sips', '--help'],
];
const WEBP_PROBE: Command[] = [['cwebp', '-version']];
const avif = (w: number, h: number, quality: string[], out: string): Image => ({
  out,
  probe: AVIF_PROBE,
  pkg: 'libavif',
  tmp: tmp(w),
  steps: [
    ['sips', '-Z', String(h), 'src/assets/profile.png', '--out', tmp(w)],
    ['avifenc', ...quality, '-s', '0', '-d', '10', '-j', '8', tmp(w), out],
  ],
});
const webp = (args: string[], out: string): Image => ({
  out,
  probe: WEBP_PROBE,
  pkg: 'webp',
  steps: [['cwebp', '-quiet', ...args, 'src/assets/profile.png', '-o', out]],
});
const images = [
  ...[500, 800, 1280].flatMap((w) => [
    avif(w, (w * 3) / 2, ['-q', '50', '--qalpha', '60', '--yuv', '444'], `src/assets/profile-${w}.avif`),
    webp(['-resize', String(w), '0', '-q', '75', '-alpha_q', '80'], `src/assets/profile-${w}.webp`),
  ]),
  // Placeholders: from the 500px scale, the size the photo shows at on a
  // typical laptop.
  avif(500, 750, ['-q', '18', '--qalpha', '25', '--yuv', '420'], 'src/assets/profile-lqip.avif'),
  webp(['-resize', '250', '0', '-q', '10'], 'public/profile-lqip.webp'),
];
// The commands as one string each, for the stamp below.
const describe = (p: Image) => p.steps.map((step) => step.join(' ')).join(' && ');
// Encoding all of them takes ~15s, so skip it when neither profile.png nor
// the commands changed since the committed files were made (the stamp file
// records both). `node scripts/generate.ts --force` re-encodes anyway.
const STAMP = 'src/assets/profile.stamp';
const stamp = createHash('sha256')
  .update(readFileSync('src/assets/profile.png'))
  // The commands contain the temp dir, which differs per machine: hash them
  // without it, or the stamp never matches anywhere else.
  .update(JSON.stringify(images.map((p) => describe(p).replaceAll(tmpdir(), '<tmp>'))))
  .digest('hex');
const upToDate =
  !process.argv.includes('--force') &&
  existsSync(STAMP) &&
  readFileSync(STAMP, 'utf8').trim() === stamp &&
  images.every((p) => existsSync(p.out));
if (upToDate) console.log('images: up to date with profile.png (stamp matches), not re-encoded');
let encodedAll = !upToDate;
for (const p of upToDate ? [] : images) {
  const tool = p.probe[0][0];
  if (has(p.probe)) {
    // stderr stays visible: a failing encoder says why.
    try {
      for (const step of p.steps) run(step, ['ignore', 'ignore', 'inherit']);
    } finally {
      if (p.tmp) rmSync(p.tmp, { force: true });
    }
    console.log(`image: regenerated ${p.out} from profile.png`);
  } else if (existsSync(p.out)) {
    encodedAll = false;
    console.log(
      `NOTE: ${tool} not available — using committed ${p.out}.`,
      `Regenerate locally (brew install ${p.pkg}) after changing profile.png.`,
    );
  } else {
    throw new Error(`Image not available: ${tool} missing and ${p.out} not found`);
  }
}
// Only a complete re-encode may vouch for every file: with one tool missing,
// some outputs are stale.
if (encodedAll) writeFileSync(STAMP, `${stamp}\n`);
// On Netlify and CI the tools are missing: a changed profile.png would
// deploy the old photos without a word.
if (!upToDate && !encodedAll && (process.env.CI || process.env.NETLIFY))
  throw new Error(
    'The images were not re-encoded (profile.png changed, or --force): run pnpm generate locally and commit the results',
  );
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
index = index.replace(
  lqipRe,
  () => `<source srcset="data:image/avif;base64,${lqip}" type="image/avif" /><img class="profile-placeholder"`,
);

// 3c) profile skeleton img: verify the cross-fade stack is present and the
//     placeholder src points at the generated file. The stack markup lives
//     directly in index.html; this check guards against drift.
if (!index.includes('<img class="profile-placeholder" src="/profile-lqip.webp"')) {
  throw new Error('Skeleton profile placeholder img not found (expected /profile-lqip.webp stack)');
}

// 3d) the real photo's srcset and sizes, written into the preload and the
//     AVIF <source> (the WebP <img> gets the same sizes): if the preload's
//     drifted, the browser would fetch the photo twice. The sizes mirror
//     the CSS layouts in src/style.css, from the same measurements:
const TEXT_EM = 33.7,
  TEXT_REM = 21; // text block height: 33.7em + 21rem
const RESERVE = 116; // footer and padding below the stacked photo (px)
const MIN_H = 280; // the stacked photo's minimum height
const MIN_W = Math.round((MIN_H * 2) / 3);
// Stacked layouts: the height the photo leaves at a given text size.
const stacked = (fs: number) =>
  `clamp(${MIN_W}px, (100vh - ${Math.round(fs * TEXT_EM + TEXT_REM * 16 + RESERVE)}px) / 1.5, 500px)`;
const SRCSET = [500, 800, 1280].map((w) => `/src/assets/profile-${w}.avif ${w}w`).join(', ');
const SIZES = [
  '(max-width: 499px) 60vw', // phones: 60% wide,
  '(max-width: 44.99em) and (orientation: portrait) 300px', // at most 300px
  '(max-width: 39.99em) min(300px, calc((100vh - 2em) / 1.5))', // phones in landscape: fit the height
  `(orientation: portrait) and (min-width: 62em) ${stacked(16)}`, // stacked, 16px text
  `(orientation: portrait) ${stacked(13)}`, // stacked, 13px text
  `(max-height: 499px) ${MIN_W}px`, // short landscape: the minimum
  `(max-width: 56.49em) ${stacked(13)}`,
  // Side by side: --pw in src/style.css.
  'min(calc((100vh - 7.25rem) / 1.5), calc(500px + max(0px, (100vw - 1440px) * .6)), calc(100vw - 48px - 37.875rem))',
].join(', ');
const sizesRe = /(imagesizes|sizes)="\(max-width: 499px\)[^"]*"/g;
if ((index.match(sizesRe) ?? []).length !== 3) throw new Error('Expected the photo sizes in 3 places in index.html');
index = index.replace(sizesRe, (_m, attr) => `${attr}="${SIZES}"`);
const srcsetRe = /(imagesrcset|srcset)="\/src\/assets\/profile-500\.avif[^"]*"/g;
if ((index.match(srcsetRe) ?? []).length !== 2) throw new Error('Expected the AVIF srcset in 2 places in index.html');
index = index.replace(srcsetRe, (_m, attr) => `${attr}="${SRCSET}"`);

writeFileSync('index.html', index);

// ---------- 4) The engineering page from Markdown ----------
// src/how-its-built.md -> <main class="post"> in how-its-built/index.html,
// in the homepage's look: the Markdown syntax stays visible but is hidden
// from screen readers. A small subset: # and ## headings, paragraphs, "- "
// lists (one level of "  - " nesting), ``` code blocks, `code`, **bold**, [links](url). {{gzip}} is left
// for the build to fill in (vite.config.ts).
const esc = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const hidden = (text: string) => `<span aria-hidden="true">${text}</span>`;
const inline = (text: string) => {
  const codes: string[] = [];
  return esc(text)
    .replace(
      /`([^`]+)`/g,
      (_m, code: string) => `\0${codes.push(`<code>${hidden('`')}${code}${hidden('`')}</code>`) - 1}\0`,
    )
    .replace(/\*\*([^*]+)\*\*/g, (_m, bold: string) => `<b>${hidden('**')}${bold}${hidden('**')}</b>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
      const external = /^https?:/.test(url);
      const name = `${label.replace(/<[^>]+>/g, '')}${external ? ' (opens in a new tab)' : ''}`;
      return `<a href="${url}"${external ? ' target="_blank" rel="noopener"' : ''} aria-label="${name}">[<span class="s">${label}</span>](<span class="l">${url}</span>)</a>`;
    })
    .replace(/\0(\d+)\0/g, (_m, n: string) => codes[Number(n)]);
};
const markdown = (source: string) => {
  const out: string[] = [];
  const lines = source.replace(/\n+$/, '').split('\n');
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)$/);
    if (fence) {
      const end = lines.indexOf('```', i + 1);
      if (end === -1) throw new Error(`Unclosed code block at line ${i + 1} of src/how-its-built.md`);
      const code = esc(lines.slice(i + 1, end).join('\n'));
      out.push(`<pre>${hidden(`\`\`\`${fence[1]}`)}\n${code}\n${hidden('```')}</pre>`);
      i = end + 1;
    } else if (/^#{1,2} /.test(line)) {
      const [marks, ...words] = line.split(' ');
      const tag = `h${marks.length}`;
      out.push(`<${tag}><span class="h">${hidden(`${marks} `)}${inline(words.join(' '))}</span></${tag}>`);
      i++;
    } else if (line.startsWith('- ')) {
      // "- " items; "  - " lines below one form its nested list.
      const item = (text: string) => `<span class="b" aria-hidden="true">- </span>${inline(text)}`;
      const items: string[] = [];
      while (lines[i]?.startsWith('- ')) {
        let li = item(lines[i++].slice(2));
        const sub: string[] = [];
        while (lines[i]?.startsWith('  - ')) sub.push(`<li>${item(lines[i++].slice(4))}</li>`);
        if (sub.length) li += `<ul>${sub.join('')}</ul>`;
        items.push(`<li>${li}</li>`);
      }
      out.push(`<ul>${items.join('')}</ul>`);
    } else if (line.trim()) {
      const para: string[] = [];
      while (lines[i]?.trim() && !/^(#{1,2} |- |```)/.test(lines[i])) para.push(lines[i++]);
      out.push(`<p>${inline(para.join(' '))}</p>`);
    } else i++;
  }
  return out.join('\n');
};
// Lines of code (non-blank), counted here so the page quotes current numbers.
const loc = (...files: string[]) =>
  files.reduce(
    (n, f) =>
      n +
      readFileSync(f, 'utf8')
        .split('\n')
        .filter((l) => l.trim()).length,
    0,
  );
const counts: Record<string, number> = {
  'lines-page': loc('src/main.ts'),
  'lines-tooling': loc(
    'vite.config.ts',
    ...readdirSync('scripts')
      .filter((f) => f.endsWith('.ts'))
      .map((f) => `scripts/${f}`),
  ),
};
const article = markdown(
  readFileSync('src/how-its-built.md', 'utf8').replace(/\{\{(lines-[a-z]+)\}\}/g, (_m, key: string) =>
    String(counts[key]),
  ),
);
const pagePath = 'how-its-built/index.html';
const page = readFileSync(pagePath, 'utf8');
const postRe = /(<main class="post">)[\s\S]*?(<\/main>)/;
if (!postRe.test(page)) throw new Error(`<main class="post"> not found in ${pagePath}`);
writeFileSync(
  pagePath,
  page.replace(postRe, (_m, open: string, close: string) => `${open}${article}${close}`),
);

console.log(
  'generate.ts:',
  'converged',
  converged.length,
  'chars;',
  'placeholder',
  placeholderBytes,
  'bytes (profile-lqip.avif);',
  'index.html synced;',
  'how-its-built page',
  article.length,
  'chars',
);
