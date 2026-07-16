# PR-14 — Third-party script hygiene: drop the Lovable editor script from production, self-host fonts

**Phase:** 5 (Performance & maintainability) · **Tier:** 3 · **Agent:** Claude Code or Codex · **Parallelizable:** yes · **Depends on:** nothing · **Expected score impact:** +0.4 overall (Performance +3, Security +1)

## 1. Background

`index.html` ships three third-party origins to every visitor:

- `index.html:53` — `<script src="https://cdn.gpteng.co/gptengineer.js" type="module">` loads **unconditionally in production**. This is Lovable's editor bridge; league visitors never need it. It is a render-path third-party script and a standing supply-chain exposure (whatever that CDN serves, your users run).
- `index.html:43-44` — Google Fonts CSS (4 families, 11 weights). Render-blocking-adjacent; one more origin.
- `index.html:46-47` — Progressier (PWA/push) — this one is a product feature; keep it, but it should be the *only* third-party runtime script.

During the review's browser walk, all three failed at the sandbox's network edge and the app rendered fine without them — direct evidence none of them is load-bearing for visitors (the fonts fall back to system faces).

## 2. Objective

**`index.html` scope:** production HTML contains no Lovable editor script (tag *and* `dns-prefetch`) and no Google Fonts origin; fonts are self-hosted; Progressier remains. Note: this brief covers `index.html` resources only — the playoff pages separately inject `brackets-viewer` from jsDelivr at runtime (`src/components/playoffs/viewer/useBracketsViewerScript.ts:7`); vendoring that is owned by **PR-13 step 8**, so after both PRs land, Progressier is the sole third-party runtime script.

## 3. Exact scope

`index.html`, `vite.config.ts` (or an `index.html` transform plugin), font assets, and a small CSS file. No React code changes.

## 4. Files to modify / create

- `index.html`
- `vite.config.ts` (dev-only injection for the Lovable script)
- `src/styles/fonts.css` (new) + `public/fonts/*.woff2` (new)

## 5. Implementation steps

1. Remove **every** `cdn.gpteng.co` reference from `index.html` — both the script tag (line 53) and the `dns-prefetch` link (line 37) — or the `grep → 0` acceptance check below fails. Re-add it **dev-only** via a tiny Vite plugin (`transformIndexHtml` gated on `mode === 'development'`) so Lovable previews keep working. Verify with Lovable that its editor flow still functions (it edits via GitHub, not via this tag, but confirm).
2. Download the used font subsets (Bebas Neue 400; IBM Plex Mono 400/600; Inter 400/500/600/700; Oswald 400–700) as woff2 into `public/fonts/`; declare `@font-face` in `src/styles/fonts.css` with `font-display: swap`; import it in the global stylesheet.
3. Remove the Google Fonts `preconnect`/`preload`/`noscript` lines from `index.html`.
4. Audit which families/weights are actually used (`grep -r "Bebas\|Plex\|Oswald" src tailwind.config*`) and drop unused ones — 11 weights across 4 families is likely over-provisioned.
5. Run Lighthouse before/after (`npx lhci autorun`) and record the delta in the PR description.

## 6. Database requirements

None.

## 7. UI/UX requirements

Pixel-identical typography (same families/weights for the ones kept). `font-display: swap` so text never blocks on fonts.

## 8. Testing requirements

- Build output check: `grep -c "gpteng" dist/index.html` → 0; `grep -c "fonts.googleapis" dist/index.html` → 0.
- Existing e2e smoke suite green (fonts are non-functional, but the suite catches accidental HTML breakage).

## 9. Validation commands

```bash
npm run build && grep -L "gpteng" dist/index.html && npm run size
npm run e2e
npm run typecheck && npm run lint && npm run test:coverage
```

## 10. Manual verification checklist (Doug)

- [ ] Production site fonts look unchanged (compare headings on /, /stats).
- [ ] DevTools → Network on production shows no requests to `cdn.gpteng.co` or `fonts.googleapis.com`.
- [ ] Lovable editing still works after the change (make a trivial edit in Lovable, confirm it lands).
- [ ] Push notifications (Progressier) still work.

## 11. Acceptance criteria

- `dist/index.html` free of gpteng + Google Fonts origins; fonts served from `/fonts/`.
- Bundle budgets still pass; Lighthouse performance not worse.

## 12. Non-goals / rollback

- Non-goals: removing Progressier, adding a CSP (worth a future brief), font subsetting beyond family/weight pruning.
- Rollback: revert the commit — the old tags come back; zero data risk.
