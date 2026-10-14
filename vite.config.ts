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

export default defineConfig({
  plugins: [inlineAssets()],
  build: {
    outDir: 'build',
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
