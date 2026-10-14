# Homepage

Personal homepage of Sascha Mayr — [saschamayr.com](https://saschamayr.com)

A one-page site styled as a markdown document rendered in a code block:
solarized/tomorrow-night colors, monospace, dark-mode toggle; on desktop it
fits the screen without scrolling (down to ~700 px of height).

## Stack

Static HTML · ~50 lines of TypeScript · Vite 8 · Lightning CSS · pnpm.
No framework, no analytics script: the built page is a single ~10 kB
(gzipped) `index.html` with the CSS, JS and photo placeholder inlined.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at localhost:3000 |
| `pnpm build` | Production build to `build/` (runs `scripts/generate.mjs` first, `scripts/verify-csp.mjs` after) |
| `pnpm preview` | Preview the production build |
| `pnpm generate` | Sync content and placeholders into `index.html` |
| `node scripts/verify-skeleton.mjs` | Check the text block in `index.html` matches `src/Intro.converged.html` |
| `scripts/test-netlify-fallback.sh` | Run `generate` with `cwebp`/`avifenc` hidden, as on Netlify |
| `node scripts/generate.mjs --force` | Re-encode the photos even though `profile.png` didn't change |

## How it fits together

- **`index.html`** is the page. All markup lives there; nothing is rendered
  by JavaScript.
- **`src/main.ts`** imports the CSS and owns the theme toggle, following OS
  theme changes, the `theme-color` meta tags and the footer year. A click
  is remembered; choosing what the OS shows anyway forgets the choice (the
  page follows the OS again). Open tabs stay in sync.
- **Inline scripts in `index.html`** set the theme before first paint
  (localStorage → OS preference) and wire the photo fade-in as early as
  possible.
- **`vite.config.ts`** has small plugins that: embed the built CSS and JS
  into `index.html`, so the page needs no follow-up requests besides
  images; minify the hand-written inline scripts and strip HTML comments;
  hash every inline script and style (SHA-256) into a
  Content-Security-Policy in `build/_headers`, so only exactly those can
  run, together with the immutable caching of each hashed photo; and fail
  the build over the size budget (see Checks). The other headers are
  static, in `netlify.toml`.
- **Without JavaScript** the page still works: a `<noscript>` style shows the
  real photo directly, hides the theme toggle and follows the OS dark mode.

### Editing content

`src/Intro.converged.html` holds the pre-highlighted markdown markup
(highlight.js-style, with short class names styled in `src/style.css`), plus
the accessibility layer: `aria-label`s on links and headings so screen
readers skip the markdown syntax, and list roles on the `- ` lines. It goes
into divs styled like `<pre><code>` (headings aren't allowed inside those).
Edit it, then run `pnpm generate` to copy it into `index.html`; `pnpm build`
does this automatically, and CI fails if the committed `index.html` is out
of sync.

Layouts (`src/style.css`):

- **Phones** (< 720 px): the text fills the first screen; the whole photo
  and the footer follow on scrolling (never cut in half by the screen
  edge). Links render reference-style (`[Shumi]`): each link's `(https://…)` part sits in a `span.u` that the
  CSS hides. A row that wraps stays visibly one item (hanging indent), and
  the email address stays visible.
- **Portrait tablets, phones in landscape, landscape windows under 904 px**:
  the same stack with full links; the photo takes the height that's left.
- **Landscape** (≥ 904 px wide, ≥ 500 px tall): text and photo side by side,
  scaled to fit the screen. Links always show in full. Where width is
  short, the photo gives way first, so the text never drops below 12 px;
  the text is at most 13 px up to 1440 px wide and grows beyond that, and
  the photo grows with it. Below ~700 px of height the page scrolls a
  little rather than shrink the text further.

Link rows are at least 24 px apart on every layout, for tapping and
clicking. Sizes are in `rem` and breakpoints in `em` (720 and 904 px at
the default 16 px), so both follow the browser's font-size setting: larger
text gets the stacked layouts sooner. The CSS is built for Safari 15 /
Chrome 100 (`build.cssTarget`), so the media queries use `min-width`, not
range syntax, which iOS 15 ignores.

### Profile photo

The photo is a cross-fade stack: a placeholder paints underneath, the real
photo sits on top at `opacity: 0` and fades in once it has loaded **and
decoded**. The placeholder is then hidden. It is decoded synchronously,
and where it still isn't loaded when the page is parsed (Safari loads even
data URIs after the first paint), the text waits for it (at most 300 ms),
so text and photo always appear in the same frame and a reload never
blinks the photo.

`generate.mjs` builds these from `src/assets/profile.png` (the 1280×1920
source photo; in the repo, but not deployed with the site):

- `src/assets/profile-{500,800,1280}.avif`: the real photo, ~20 / 48 /
  120 KB, picked by `srcset`/`sizes` (and the matching preload) so phones
  get the small one and big or high-DPI screens a sharp one. The
  `profile-{500,800,1280}.webp` files are the fallback for browsers without
  AVIF.
- `src/assets/profile-lqip.avif`: placeholder, 500 px, ~4.4 KB (alpha at a
  higher quality than the colour, for cleaner edges), embedded in
  `index.html` as a data URI so it paints with the first response
- `profile-lqip.webp`: placeholder fallback, half resolution, ~4.4 KB

The real photo goes through Vite, so it ships with a content hash in its
name (`/assets/profile-500-<hash>.avif`) and is cached for a year as immutable
(`build/_headers`, file by file, so a 404 under `/assets/` isn't).
The unhashed files (icons, `og.png`, `sascha-mayr.jpg`, the WebP
placeholder) get 30 days, also named one by one; the HTML is always
revalidated (`netlify.toml`).

The tools (`avifenc`, `cwebp`; `brew install libavif webp`; plus macOS
`sips` for resizing) aren't on Netlify, so the build there uses the
committed files. After changing
`profile.png`, run `pnpm generate` locally and commit the regenerated
files.

`generate.mjs` skips the encoding when `src/assets/profile.stamp` (a hash of
`profile.png` and the encoder commands) matches; `--force` re-encodes.

`public/og.png` (the 1200×630 link-preview image) and `public/sascha-mayr.jpg`
(800×1200 on the page background, the stable photo URL in the JSON-LD) were
generated once and are not part of the pipeline. Regenerate them by hand if
the photo or tagline changes.

## Checks

- **Size budget:** `vite.config.ts` fails the build if the page is over
  10.5 kB gzipped, so the footer's "10 kB" stays true. It also minifies
  the hand-written inline scripts and strips HTML comments.
- **CSP:** `scripts/verify-csp.mjs` (part of `pnpm build`) fails if any
  inline script or style in the built pages lacks its hash in
  `build/_headers`. Local previews and Lighthouse CI don't send the policy,
  so nothing else would notice before production.
- **CI** (`.github/workflows/check.yml`, on every push and PR; actions
  pinned by commit, kept current by Dependabot): the content in
  `index.html` is in sync, the build passes the budget and the CSP check,
  and Lighthouse CI (`lighthouserc.json`, 3 mobile runs) scores 100 for
  accessibility, best practices and SEO, and at least 98 for performance
  (2 points of slack for CI timing noise).

## Deploy

Netlify, auto-deploys from `master` (Node 24, `pnpm run build`, publish
`build/`). `netlify.toml` holds the security headers (HSTS with
`includeSubDomains; preload`, Permissions-Policy, framing, MIME sniffing),
the caching rules and a few redirects: `/index.html` goes to `/`, and
`/404` and `/404.html` answer 404. Unknown URLs get `404.html` (built by
Vite, so it's covered by the CSP) with a real 404 status; it follows the
same remembered light/dark choice.

## License

The code is MIT (`LICENSE`). The photos and the personal content are not:
© Sascha Mayr, all rights reserved (`NOTICE`).
