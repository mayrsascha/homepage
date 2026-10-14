import { defineConfig, minify, type Plugin } from 'vite'

// Inline the (tiny) CSS and JS bundles into index.html: zero render-blocking
// requests and no request chain after the document itself.
function inlineAssets(): Plugin {
  return {
    name: 'inline-assets',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const page = bundle['index.html']
      if (!page || page.type !== 'asset') return
      let html = String(page.source)
      for (const [name, chunk] of Object.entries(bundle)) {
        if (name.endsWith('.css') && chunk.type === 'asset') {
          const re = new RegExp(`<link rel="stylesheet"[^>]*href="/${name}"[^>]*>`)
          if (!re.test(html)) continue
          html = html.replace(re, () => `<style>${chunk.source}</style>`)
          delete bundle[name]
        } else if (name.endsWith('.js') && chunk.type === 'chunk' && chunk.isEntry) {
          const re = new RegExp(`<script type="module"[^>]*src="/${name}"[^>]*></script>`)
          if (!re.test(html)) continue
          html = html.replace(re, () => `<script type="module">${chunk.code.replace(/<\/script/gi, '<\\/script')}</script>`)
          delete bundle[name]
        }
      }
      page.source = html
    },
  }
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
        if (page.type !== 'asset' || !page.fileName.endsWith('.html')) continue
        let html = String(page.source).replace(/<!--[\s\S]*?-->\s*/g, '')
        const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
        for (const [whole, code] of scripts) {
          const { code: min } = await minify('inline.js', code)
          html = html.replace(whole, () => `<script>${min.trim()}</script>`)
        }
        html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
          (_m, open, json, close) => open + JSON.stringify(JSON.parse(json)) + close)
        page.source = html
      }
    },
  }
}

// The footer says "10 kB": fail the build before that stops being true
// (the page gzipped, everything but the photos included).
const PAGE_BUDGET = 10_500
function sizeBudget(): Plugin {
  return {
    name: 'size-budget',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_, bundle) {
      const page = bundle['index.html']
      if (!page || page.type !== 'asset') return
      const gz = new Blob([String(page.source)]).stream().pipeThrough(new CompressionStream('gzip'))
      const size = (await new Response(gz).arrayBuffer()).byteLength
      if (size > PAGE_BUDGET) this.error(`index.html is ${size} B gzipped, over the ${PAGE_BUDGET} B budget the footer's "10 kB" promises`)
      console.log(`size-budget: index.html ${size} B gzipped (budget ${PAGE_BUDGET} B)`)
    },
  }
}

// Content-Security-Policy: the SHA-256 of every inline script and style in
// the built pages, so only exactly these can run. The hashes change with
// every build, so the policy is written here into Netlify's _headers file
// (one site-wide policy: the 404 page is served at arbitrary paths). As a
// header rather than a <meta>, it costs the page no bytes and can include
// frame-ancestors. The other security headers are static, in netlify.toml.
async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return `'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`
}

function cspHeaders(): Plugin {
  return {
    name: 'csp-headers',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_, bundle) {
      const scripts = new Set<string>()
      const styles = new Set<string>()
      for (const page of Object.values(bundle)) {
        if (page.type !== 'asset' || !page.fileName.endsWith('.html')) continue
        const html = String(page.source)
        // Inline executable scripts only (no src, not JSON-LD data).
        for (const m of html.matchAll(/<script(?![^>]*\ssrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) scripts.add(await sha256(m[1]))
        for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) styles.add(await sha256(m[1]))
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
      ].join('; ')
      // Content-hashed assets (the photos) are immutable: a new file means a
      // new URL. Listed one by one rather than as /assets/*, which would also
      // cache a 404 for a missing asset for a year.
      const assets = Object.keys(bundle).filter((f) => f.startsWith('assets/'))
        .map((f) => `/${f}\n  Cache-Control: public, max-age=31536000, immutable\n`).join('')
      this.emitFile({ type: 'asset', fileName: '_headers', source: `/*\n  Content-Security-Policy: ${policy}\n${assets}` })
    },
  }
}

export default defineConfig({
  // Order matters: the CSP hashes cover the inlined and minified code.
  plugins: [inlineAssets(), minifyInline(), cspHeaders(), sizeBudget()],
  build: {
    outDir: 'build',
    rollupOptions: {
      input: { main: 'index.html', notFound: '404.html' },
    },
    // Vite 8: Oxc minifier is the default (esbuild removed), single-chunk output
    cssMinify: 'lightningcss',
    modulePreload: {
      polyfill: false,
    },
  },
  server: {
    port: 3000,
  },
})
