# Homepage

Personal homepage of Sascha Mayr — [saschamayr.com](https://saschamayr.com)

A one-page site styled as a markdown document rendered in a code block:
solarized/tomorrow-night colors, monospace, dark-mode toggle; on desktop it
fits the screen without scrolling (down to ~800 px of height).

## Stack

Static HTML · ~50 lines of TypeScript · Vite 8 · Lightning CSS · Biome · pnpm ·
Node 26 (the build scripts are TypeScript, run directly by Node).
No framework, no analytics script: the built page is a single ~10 kB
(gzipped) `index.html` with the CSS, JS and photo placeholder inlined.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at localhost:3000 |
| `pnpm build` | Production build to `build/` (runs `scripts/generate.ts` and `tsc -b` first, `scripts/verify-build.ts` after) |
| `pnpm check` | `build`, then fail if it changed a committed file (what CI runs) |
| `pnpm lint` / `pnpm format` | Biome: check, or fix and format |
| `pnpm dlx @lhci/cli@0.15.1 autorun` | Lighthouse CI locally (CI runs it from a GitHub Action) |
| `pnpm preview` | Preview the production build |
| `node scripts/serve.ts` | Serve `build/` with its `_headers` (CSP, caching), as Netlify does, at localhost:5180 |
| `pnpm generate` | Sync content, placeholder and photo `sizes` into `index.html` |
| `scripts/test-netlify-fallback.sh` | Test the photo fallback with `cwebp`/`avifenc` hidden, as on Netlify |
| `node scripts/generate.ts --force` | Re-encode the photos even though `profile.png` didn't change |

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
  Content-Security-Policy (with Trusted Types) in `build/_headers`, so
  only exactly those can run, together with the other security headers
  and the caching rules (see Profile photo); and fail the build over the
  size budget (see Checks). Every header the site sets is in that file.
- **`tsconfig.app.json`** checks the page's TypeScript, **`tsconfig.node.json`**
  the Vite config and `scripts/*.ts` (`tsc -b` runs both). Biome
  (`biome.json`) lints the TypeScript, CSS and JSON and formats the
  TypeScript and JSON (the CSS keeps its compact one-line rules).
- **Printing** always uses the light colours (printers skip the dark
  background) and fits one page with the URLs, whatever the paper.
- **Without JavaScript** the page still works: a `<noscript>` style shows the
  real photo directly, hides the theme toggle and follows the OS dark mode.

### Editing content

`src/Intro.converged.html` holds the pre-highlighted markdown markup
(highlight.js-style, with short class names styled in `src/style.css`), plus
the accessibility layer: `aria-label`s on links and headings so screen
readers skip the markdown syntax (and hear "opens in a new tab"), and list
roles on the `- ` lines. It goes
into divs styled like `<pre><code>` (headings aren't allowed inside those).
Edit it, then run `pnpm generate` to copy it into `index.html`; `pnpm build`
does this automatically, and CI fails if the committed `index.html` is out
of sync.

Layouts (`src/style.css`):

- **Phones** (< 720 px, or < 640 px in landscape): the text (12–14 px, growing with the screen
  height) fills at least the first screen; the whole photo
  and the footer follow on scrolling (never cut in half by the screen
  edge). Links render reference-style (`[Shumi]`): each link's `(https://…)` part sits in a `span.u` that the
  CSS hides. A row that wraps stays visibly one item (hanging indent), and
  the email address stays visible.
- **Portrait tablets, phones in landscape, landscape windows under 904 px**:
  the same stack with full links (12 px under 720 px wide); the photo
  takes the height that's left. Where even its 280 px minimum doesn't fit,
  it moves whole to the second screen, as on phones.
- **Landscape** (≥ 904 px wide, ≥ 500 px tall): text and photo side by side,
  scaled to fit the screen. Links always show in full. Where width is
  short, the photo gives way first, so the text never drops below 12 px;
  the text is at most 13 px up to 1440 px wide and grows beyond that, and
  the photo grows with it. Below ~800 px of height the page scrolls a
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

`generate.ts` builds these from `src/assets/profile.png` (the 1280×1920
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
The unhashed files (icons including `favicon.svg`, `og.png`, `sascha-mayr.jpg`, the WebP
placeholder) get 30 days, also named one by one (`MONTH_CACHED` in
`vite.config.ts`); the HTML is always revalidated.

The tools (`avifenc`, `cwebp`; `brew install libavif webp`; plus macOS
`sips` for resizing) aren't on Netlify, so the build there uses the
committed files. After changing
`profile.png`, run `pnpm generate` locally and commit the regenerated
files.

`generate.ts` skips the encoding when `src/assets/profile.stamp` (a hash of
`profile.png` and the encoder commands) matches; `--force` re-encodes. On
Netlify and CI a mismatch fails the build rather than deploy stale photos.
The photo's `srcset` and `sizes` in `index.html` are written by
`generate.ts` too, from the same layout measurements as `src/style.css`.

`public/og.png` (the 1200×630 link-preview image) and `public/sascha-mayr.jpg`
(800×1200 on the page background, the stable photo URL in the JSON-LD) were
generated once and are not part of the pipeline. Regenerate them by hand if
the photo or tagline changes.

## Checks

- **Size budget:** `vite.config.ts` fails the build if the page is over
  10.5 kB gzipped, so the footer's "10 kB" stays true. It also minifies
  the hand-written inline scripts and strips HTML comments.
- **`scripts/verify-build.ts`** (part of `pnpm build`) fails if a security
  header is missing or weakened in `build/_headers`, if any inline script
  or style in the built pages lacks its hash there, or if the pages use
  anything the policy blocks: external stylesheets or scripts (the build
  itself also fails when it can't inline one), style attributes, event
  handlers, `javascript:` URLs. It also checks the
  theme copies that `src/style.css` can't reach (the `noscript` style, the
  inline scripts, the `theme-color` tags, `src/main.ts`, `404.html`): each
  copy must be complete and match its own theme, and the storage key must
  match.
- **CI** (`.github/workflows/check.yml`, on every push and PR; actions
  pinned by commit, kept current by Dependabot, which waits 7 days after a
  release; pnpm refuses versions younger than 3 days, `pnpm-workspace.yaml`): `pnpm check` (the build
  passes the budget and `verify-build`, and leaves `index.html` and the
  photos unchanged), Biome, the Netlify fallback test, and Lighthouse CI
  (`treosh/lighthouse-ci-action`, so the repo doesn't install it;
  `lighthouserc.json`, 3 mobile runs) against `scripts/serve.ts`, so
  the page loads under its real CSP: a blocked script is a console error,
  which fails best practices. It must score 100 for accessibility, best
  practices and SEO, and at least 98 for performance (2 points of slack
  for CI timing noise).

## Deploy

Netlify, auto-deploys from `master` (Node from `.nvmrc`, `pnpm run build`,
publish `build/`). The headers come from `build/_headers` (HSTS with
`includeSubDomains; preload`, CSP, COOP, Permissions-Policy, framing, MIME
sniffing, caching); `netlify.toml` holds the build settings and a few
redirects: `/index.html` goes to `/`, and
`/404` and `/404.html` answer 404. Unknown URLs get `404.html` (built by
Vite, so it's covered by the CSP) with a real 404 status; it follows the
same remembered light/dark choice.

## License

The code is MIT (`LICENSE`). The photos and the personal content are not:
© Sascha Mayr, all rights reserved (`NOTICE`).
