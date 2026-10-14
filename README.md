# Homepage

Personal homepage of Sascha Mayr — [saschamayr.com](https://saschamayr.com)

A one-page site styled as a markdown document rendered in a code block:
solarized/tomorrow-night colors, monospace, dark-mode toggle, no scroll.

## Stack

Static HTML · ~20 lines of TypeScript · Vite 8 · Lightning CSS · pnpm.
No framework, no analytics script: the built page is a single ~10 kB
(gzipped) `index.html` with the CSS, JS and photo placeholder inlined.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at localhost:3000 |
| `pnpm build` | Production build to `build/` (runs `scripts/generate.mjs` first) |
| `pnpm preview` | Preview the production build |
| `pnpm generate` | Sync content and placeholders into `index.html` |
| `node scripts/verify-skeleton.mjs` | Check the text block in `index.html` matches `src/Intro.converged.html` |
| `bash scripts/test-netlify-fallback.mjs` | Run `generate` with `cwebp`/`avifenc` hidden, as on Netlify |

## How it fits together

- **`index.html`** is the page. All markup lives there; nothing is rendered
  by JavaScript.
- **`src/main.ts`** imports the CSS and owns the theme toggle, following OS
  theme changes, the `theme-color` meta tag and the footer year.
- **Inline scripts in `index.html`** set the theme before first paint
  (localStorage → OS preference) and wire the photo fade-in as early as
  possible.
- **`vite.config.ts`** has a small `inline-assets` plugin that embeds the
  built CSS and JS into `index.html`, so the page needs no follow-up
  requests besides images.

### Editing content

`src/Intro.converged.html` holds the pre-highlighted markdown markup
(highlight.js-style, with short class names styled in `src/style.css`, plus `aria-label`s on links and headings so screen
readers skip the markdown syntax). Edit it, then run `pnpm generate` to copy
it into `index.html`. `pnpm build` does this automatically.

### Profile photo

The photo is a cross-fade stack: a placeholder paints underneath, the real
photo sits on top at `opacity: 0` and fades in once it has loaded **and
decoded**. The placeholder is then hidden.

`generate.mjs` builds these from `public/profile.png`:

- `src/assets/profile.avif`: the real photo, ~23 KB (`src/assets/profile.webp`, 54 KB, is the
  hand-made fallback for browsers without AVIF)
- `profile-lqip.avif`: placeholder, full resolution, ~4.7 KB, embedded in
  `index.html` as a data URI so it paints with the first response
- `profile-lqip.webp`: placeholder fallback, half resolution, ~5 KB

The real photo goes through Vite, so it ships with a content hash in its
name (`/assets/profile-<hash>.avif`) and is cached for a year as immutable.
Unhashed icons get 30 days; the HTML is always revalidated (`netlify.toml`).

The tools (`avifenc`, `cwebp`; `brew install libavif webp`) aren't on
Netlify, so the build there uses the committed files. After changing
`profile.png`, run `pnpm generate` locally and commit the regenerated
files.

`public/og.png` (the 1200×630 link-preview image) was generated once and is
not part of the pipeline. Regenerate it by hand if the photo or tagline
changes.

## Deploy

Netlify, auto-deploys from `master`. Config in `netlify.toml`
(Node 20, `pnpm run build`, publish `build/`). Unknown URLs get
`public/404.html` with a real 404 status.
