# PR-14 — Third-party script hygiene

Remove `cdn.gpteng.co` and Google Fonts from production `index.html`. Self-host the four font families. Keep Progressier. No React code changes.

## Verified current state
- `index.html:36` has `dns-prefetch` to `cdn.gpteng.co`; `index.html:52` loads `gptengineer.js`.
- `index.html:31-32, 41-43` reference `fonts.googleapis.com` / `fonts.gstatic.com` for Bebas Neue, IBM Plex Mono (400/600), Inter (400/500/600/700), Oswald (400/500/600/700).
- `tailwind.config.ts` declares `inter`, `bebas`, `oswald`, `mono` (IBM Plex Mono) — all four families are in active use, so none can be dropped.
- `vite.config.ts` already has a `mode`-aware plugin array — trivial place to add a dev-only injector.

## Changes

### 1. `index.html`
- Delete the `dns-prefetch` for `cdn.gpteng.co` (line 36).
- Delete the `<script src="https://cdn.gpteng.co/gptengineer.js">` tag (line 52).
- Delete Google Fonts `preconnect` (lines 31-32), `preload` (line 42), and `<noscript>` fallback (line 43).
- Leave Progressier, Supabase preconnect, LCP image preload, and Open Graph tags untouched.

### 2. `vite.config.ts` — dev-only Lovable editor injection
Add a small inline plugin so Lovable's in-app preview editor keeps working in the sandbox but never ships to production:

```ts
{
  name: 'inject-lovable-editor-dev',
  apply: 'serve', // dev only
  transformIndexHtml: (html) => html.replace(
    '</body>',
    '  <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>\n  </body>'
  ),
}
```

### 3. Self-hosted fonts
- Add `public/fonts/` with woff2 files for:
  - Bebas Neue 400
  - IBM Plex Mono 400, 600
  - Inter 400, 500, 600, 700
  - Oswald 400, 500, 600, 700
  Downloaded from the Google Fonts static CDN (`fonts.gstatic.com`) — Latin subset only to keep the payload small.
- Create `src/styles/fonts.css` with one `@font-face` block per file, all using `font-display: swap` and `src: url('/fonts/<file>.woff2') format('woff2')`.
- Import `./styles/fonts.css` at the top of `src/index.css` (before Tailwind directives).

### 4. Verification
- `npm run build` then `grep -c gpteng dist/index.html` → 0 and `grep -c fonts.googleapis dist/index.html` → 0.
- `npm run typecheck && npm run lint`.
- Spot-check preview: headings on `/` and `/stats` render in Bebas / Oswald, body in Inter.

## Notes / non-goals
- Weight pruning beyond the brief's list is deferred — Tailwind config keeps all four families, so shipping the listed weights is the safe pixel-identical baseline.
- `brackets-viewer` from jsDelivr is out of scope (owned by PR-13 step 8).
- No CSP work, no Progressier changes.
- Rollback: revert the commit.
