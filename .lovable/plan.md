
Goal: fix the black/empty bracket area by aligning our renderer behavior with brackets-viewer docs.

What I found
1) Your test bracket is saved correctly and has real bracket-manager data:
- bracket exists with `season_id`
- stage exists (`double_elimination`)
- groups/rounds/matches exist (31 matches)

2) The current renderer has custom “block rendering” guards that are not part of brackets-viewer docs:
- In `useBracketsViewerRenderer.ts`, it computes `sourcePct` and aborts render when `< 0.6`.
- New/bye-heavy double elimination brackets naturally have many unresolved slots, so this threshold can fail even when data is valid.
- That produces the “empty black” panel.

3) brackets-viewer documentation expects rendering with:
- `stages`, `matches`, `matchGames`, `participants` (plus optional `groups/rounds`)
- Missing connector source metadata should affect connector lines, not prevent the whole bracket UI from rendering.

Implementation plan (small, safe diff)
1) Update `src/components/playoffs/viewer/useBracketsViewerRenderer.ts`
- Remove the hard stop:
  - delete/replace `if (sourcePct < 0.6) return;`
- Keep the metric, but only log a warning for diagnostics.
- Continue calling `window.bracketsViewer.render(...)` whenever `matches.length > 0` and `stages.length > 0`.

2) Make identity-tag validation non-blocking (same file)
- Current code sets fatal error and returns when symbol tags are missing.
- Change this to warn-only so valid brackets still render.
- This avoids false negatives from internal object-shape differences.

3) Keep existing error handling for real failures
- Preserve script-load and render try/catch behavior.
- Preserve “no matches/stages” guard as the only render blocker.

Why this is the right fix
- It matches brackets-viewer intended usage from docs.
- It fixes empty-screen behavior without touching DB schema/services.
- It keeps diagnostics, but stops non-standard prechecks from blocking valid brackets.

Files to change
- `src/components/playoffs/viewer/useBracketsViewerRenderer.ts` (only file)

Verification checklist (end-to-end)
1) Open your test bracket (the one in the screenshot): bracket cards should appear instead of a blank area.
2) Refresh the page: bracket should still render.
3) Create a new bracket with BYEs: first round and structure should render immediately.
4) Open a completed bracket: ensure connectors and match click still work.

Technical note
- This is a display-layer fix only.
- No migration, no service contract change, no brackets-manager storage change.
