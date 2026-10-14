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
| `scripts/test-netlify-fallback.sh` | Run `generate` with `cwebp`/`avifenc` hidden, as on Netlify |

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
  requests besides images. A second plugin hashes every inline script and
  style (SHA-256) and writes the Content-Security-Policy into
  `build/_headers`, so only exactly those can run. The other security
  headers are static, in `netlify.toml`.
- **Without JavaScript** the page still works: a `<noscript>` style shows the
  real photo directly and hides the theme toggle.

### Editing content

`src/Intro.converged.html` holds the pre-highlighted markdown markup
(highlight.js-style, with short class names styled in `src/style.css`, plus `aria-label`s on links and headings so screen
readers skip the markdown syntax). Edit it, then run `pnpm generate` to copy
it into `index.html`. `pnpm build` does this automatically.

Layouts (`src/style.css`):

- **Phones** (< 720 px): text, then the photo. Links render reference-style
  (`[Shumi]`): each link's `(https://…)` part sits in a `span.u` that the
  CSS hides.
- **Portrait tablets, phones in landscape**: the same stack with full links;
  the photo takes the height that's left.
- **Landscape** (≥ 720 px wide, ≥ 500 px tall): text and photo side by side,
  scaled to fit the screen with no scrolling. Text is 13 px up to 1440 px
  wide and grows beyond that; the photo grows with it. Links always show
  in full: on narrower screens the text column takes more than half the
  width and the text shrinks to fit.

### Profile photo

The photo is a cross-fade stack: a placeholder paints underneath, the real
photo sits on top at `opacity: 0` and fades in once it has loaded **and
decoded**. The placeholder is then hidden.

`generate.mjs` builds these from `src/assets/profile.png` (the 1280×1920
source photo; not published):

- `src/assets/profile-{500,800,1280}.avif`: the real photo, ~20 / 48 /
  120 KB, picked by `srcset`/`sizes` (and the matching preload) so phones
  get the small one and big or high-DPI screens a sharp one. The
  `profile-{500,800,1280}.webp` files are the fallback for browsers without
  AVIF.
- `src/assets/profile-lqip.avif`: placeholder, 500 px, ~4.2 KB, embedded in
  `index.html` as a data URI so it paints with the first response
- `profile-lqip.webp`: placeholder fallback, half resolution, ~4.4 KB

The real photo goes through Vite, so it ships with a content hash in its
name (`/assets/profile-500-<hash>.avif`) and is cached for a year as immutable.
Unhashed icons get 30 days; the HTML is always revalidated (`netlify.toml`).

The tools (`avifenc`, `cwebp`; `brew install libavif webp`; plus macOS
`sips` for resizing) aren't on
Netlify, so the build there uses the committed files. After changing
`profile.png`, run `pnpm generate` locally and commit the regenerated
files.

`public/og.png` (the 1200×630 link-preview image) was generated once and is
not part of the pipeline. Regenerate it by hand if the photo or tagline
changes.

## Deploy

Netlify, auto-deploys from `master`. Config in `netlify.toml`
(Node 24, `pnpm run build`, publish `build/`). Unknown URLs get
`404.html` (built by Vite, so it's covered by the CSP) with a real 404
status; it follows the same remembered light/dark choice.
