import { createHash } from 'node:crypto';
import { Features } from 'lightningcss';
import { defineConfig, minify, type Plugin } from 'vite';

// Inline the (tiny) CSS and JS bundles into every page: zero render-blocking
// requests and no request chain after the document itself. A stylesheet or
// script left external fails the build: the CSP would block it.
function inlineAssets(): Plugin {
  return {
    name: 'inline-assets',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const inlined = new Set<string>();
      const take = (name: string) => {
        const item = bundle[name];
        if (!item) this.error(`could not inline ${name}: not in the bundle`);
        inlined.add(name);
        return item.type === 'asset' ? String(item.source) : item.code.replace(/<\/script/gi, '<\\/script');
      };
      for (const page of Object.values(bundle)) {
        if (page.type !== 'asset' || !page.fileName.endsWith('.html')) continue;
        page.source = String(page.source)
          .replace(
            /<link rel="stylesheet"[^>]*href="\/([^"]+\.css)"[^>]*>/g,
            (_m, name: string) => `<style>${take(name)}</style>`,
          )
          .replace(
            /<script type="module"[^>]*src="\/([^"]+\.js)"[^>]*><\/script>/g,
            (_m, name: string) => `<script type="module">${take(name)}</script>`,
          );
        if (/<link[^>]+rel="(?:stylesheet|modulepreload)"|<script[^>]*\ssrc=/.test(page.source))
          this.error(`${page.fileName}: a stylesheet or script is still external, the CSP would block it`);
      }
      for (const name of inlined) delete bundle[name];
    },
  };
}

// The hand-written parts of the HTML ship as written unless minified here:
// strip HTML comments, minify the classic inline scripts (Vite leaves them
// alone) and compact the JSON-LD. Runs on every built page, before the CSP
// hashes are taken.
function minifyInline(): Plugin {
  return {
    name: 'minify-inline',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_, bundle) {
      for (const page of Object.values(bundle)) {
        if (page.type !== 'asset' || !page.fileName.endsWith('.html')) continue;
        let html = String(page.source).replace(/<!--[\s\S]*?-->\s*/g, '');
        const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
        for (const [whole, code] of scripts) {
          const { code: min } = await minify('inline.js', code);
          html = html.replace(whole, () => `<script>${min.trim()}</script>`);
        }
        html = html.replace(
          /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
          (_m, open, json, close) => open + JSON.stringify(JSON.parse(json)) + close,
        );
        page.source = html;
      }
    },
  };
}

// The footer says "10 kB": fail the build before that stops being true
// (the page gzipped, everything but the photos included).
const PAGE_BUDGET = 10_500;
function sizeBudget(): Plugin {
  return {
    name: 'size-budget',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_, bundle) {
      const page = bundle['index.html'];
      if (page?.type !== 'asset') return;
      const gz = new Blob([String(page.source)]).stream().pipeThrough(new CompressionStream('gzip'));
      const size = (await new Response(gz).arrayBuffer()).byteLength;
      if (size > PAGE_BUDGET)
        this.error(`index.html is ${size} B gzipped, over the ${PAGE_BUDGET} B budget the footer's "10 kB" promises`);
      console.log(`size-budget: index.html ${size} B gzipped (budget ${PAGE_BUDGET} B)`);
      // The engineering page quotes this number: fill it in, so it can't go stale.
      for (const other of Object.values(bundle)) {
        if (other.type === 'asset' && other.fileName.endsWith('.html'))
          other.source = String(other.source).replaceAll('{{gzip}}', size.toLocaleString('en-US'));
      }
    },
  };
}

// Netlify's _headers file, written per build, holds every header we set
// (so scripts/serve.ts, and with it Lighthouse CI, serves all of them):
// - The security headers below, on every path.
// - Content-Security-Policy: the SHA-256 of every inline script and style in
//   the built pages, so only exactly these can run. One site-wide policy
//   (the 404 page is served at arbitrary paths). As a header rather than a
//   <meta>, it costs the page no bytes and can include frame-ancestors.
// - Caching for the files that need more than Netlify's default (always
//   revalidate), each named: a wildcard would also cache a 404 for a
//   missing file.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  // For browsers without CSP frame-ancestors.
  'X-Frame-Options': 'DENY',
  // Two years, all subdomains, eligible for the browsers' preload list
  // (hstspreload.org): browsers never try plain HTTP, not even on the first
  // visit. Every future subdomain must serve HTTPS.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

const sha256 = (text: string) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

// Unhashed files from public/ can't change URL when their content changes:
// 30 days, revalidated in the background. (Old URLs like /logo192.png still
// get requested; those stay uncached 404s.)
const MONTH_CACHED = [
  '/profile-lqip.webp',
  '/apple-touch-icon.png',
  '/og.png',
  '/og-how-its-built.png',
  '/sascha-mayr.jpg',
  '/favicon.svg',
  '/favicon.ico',
];

function netlifyHeaders(): Plugin {
  return {
    name: 'netlify-headers',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const scripts = new Set<string>();
      const styles = new Set<string>();
      for (const page of Object.values(bundle)) {
        if (page.type !== 'asset' || !page.fileName.endsWith('.html')) continue;
        const html = String(page.source);
        // Inline executable scripts only (no src, not JSON-LD data).
        for (const m of html.matchAll(
          /<script(?![^>]*\ssrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g,
        ))
          scripts.add(sha256(m[1]));
        for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) styles.add(sha256(m[1]));
      }
      const policy = [
        "default-src 'none'",
        `script-src ${[...scripts].join(' ')}`,
        `style-src ${[...styles].join(' ')}`,
        "img-src 'self' data:",
        // The page itself makes no requests; 'self' lets tools like
        // Lighthouse fetch /robots.txt from the page context.
        "connect-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        // Trusted Types: no script can reach the DOM's HTML/script sinks
        // (innerHTML, eval, script.src...); this page uses none.
        "require-trusted-types-for 'script'",
        "trusted-types 'none'",
      ].join('; ');
      // Content-hashed assets (the photos) are immutable: a new file means a
      // new URL.
      const rule = (path: string, cache: string) => `${path}\n  Cache-Control: ${cache}\n`;
      const assets = Object.keys(bundle)
        .filter((f) => f.startsWith('assets/'))
        .map((f) => rule(`/${f}`, 'public, max-age=31536000, immutable'))
        .join('');
      const month = MONTH_CACHED.map((f) => rule(f, 'public, max-age=2592000, stale-while-revalidate=2592000')).join(
        '',
      );
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: `/*\n${[...Object.entries(SECURITY_HEADERS), ['Content-Security-Policy', policy]]
          .map(([name, value]) => `  ${name}: ${value}\n`)
          .join('')}${assets}${month}`,
      });
    },
  };
}

export default defineConfig({
  // Order matters: the CSP hashes cover the inlined and minified code.
  plugins: [inlineAssets(), minifyInline(), netlifyHeaders(), sizeBudget()],
  css: {
    // The CSS target below makes Lightning CSS emit light-dark() polyfill
    // variables; the page doesn't use light-dark(), so they're dead bytes.
    lightningcss: { exclude: Features.LightDark },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      input: { main: 'index.html', notFound: '404.html', howItsBuilt: 'how-its-built/index.html' },
    },
    // Vite's default CSS target (Safari 16.4) writes media queries in range
    // syntax (width>=45em), which iOS 15 and Chrome < 104 ignore: no layout
    // at all, an invisible photo. Target older browsers so they get
    // min-/max-width (costs ~7 bytes).
    cssTarget: ['safari15', 'ios15', 'chrome100', 'firefox100'],
    modulePreload: {
      polyfill: false,
    },
  },
  server: {
    port: 3000,
  },
});
