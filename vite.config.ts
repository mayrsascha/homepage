import { defineConfig, type Plugin } from 'vite'

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
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ].join('; ')
      this.emitFile({ type: 'asset', fileName: '_headers', source: `/*\n  Content-Security-Policy: ${policy}\n` })
    },
  }
}

export default defineConfig({
  // inlineAssets must run first: the CSP hashes cover the inlined CSS/JS.
  plugins: [inlineAssets(), cspHeaders()],
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
