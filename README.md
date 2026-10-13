# Homepage

Personal homepage of Sascha Mayr — [saschamayr.com](https://saschamayr.com)

A one-page site styled as a markdown document rendered in a code block:
solarized/tomorrow-night colors, monospace, dark-mode toggle, no scroll.

## Stack

Vite 8 · React 19 · TypeScript 7 · pnpm

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at localhost:3000 |
| `pnpm build` | Production build to `build/` (runs `scripts/generate.mjs` first) |
| `pnpm preview` | Preview the production build |

## How the content pipeline works

Most of the page is static by design — first paint must equal final paint
(zero layout flash). `scripts/generate.mjs` (wired into `pnpm build`) keeps
everything in sync:

1. **Text block** — `src/Intro.converged.html` holds the pre-highlighted
   markdown markup. The script writes it into both the React string
   (`src/Intro.highlighted.ts`) and the pre-hydration skeleton in
   `index.html`, byte-identical. Edit `Intro.converged.html` to change
   site content, then run `pnpm generate`.
2. **Profile photo** — the script generates a ~400-byte blurred WebP
   thumbnail (LQIP) from `public/profile.png` and inlines it as base64
   in the `<img>`, so a blurry version of the photo paints with the HTML.
   A tiny script swaps in the real image once it has downloaded.

Theme (light/dark) is resolved by an inline pre-paint script
(localStorage → OS preference) driving CSS variables — no flash, no
runtime theme switching.

## Deploy

Netlify, auto-deploys from `master`. Config in `netlify.toml`
(Node 20, `pnpm run build`, publish `build/`).
