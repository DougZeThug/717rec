## Goal
A11y polish covering four issues from the audit checklist: clickable logos, unlabeled admin inputs, hero-card drop zone, and live-region announcements for score updates.

## Scope

### 1. Clickable `TeamLogo` / `TeamImage` divs — keyboard activation
Four variants render a `<div>` with `tabIndex={0}` and `aria-label` but no `role="button"` and no keyboard handler. When wrapped in a `Link`, the anchor covers it; when used standalone with an `onClick` (future/other callers), it's inert to keyboard users. Add explicit semantics on the container when `clickable` is true (or, preferred, only render the tabIndex/aria when there is no wrapping `Link` — the `Link` already provides the accessible name and keyboard activation).

Files:
- `src/components/shared/TeamLogo.tsx`
- `src/components/ui/team/TeamLogo.tsx`
- `src/components/ui/team/TeamImage.tsx`
- `src/components/stats/rank/TeamLogo.tsx`

Fix: when `clickable && teamId`, drop the redundant `tabIndex`/`aria-label` from the inner `<div>` (the wrapping `<Link>` is the single accessible control). When `clickable` without `teamId`, add `role="button"` and an `onKeyDown` that fires the same action as `onClick` (Enter / Space). No visual change.

### 2. Labels on placeholder-only admin inputs
Add proper `<Label htmlFor>` or `aria-label` to admin `Input`s that today rely solely on `placeholder`. Sweep the 20 files under `src/components/admin/**` returned by `rg -l "placeholder="`, but only patch inputs missing an associated label. Expected hotspots: `MatchScoreItem`, `MatchRow`, `MatchFormRow`, `DivisionRow`, `RequestsTab`, `BlindDrawSignupsTab`, `OpponentHistoryTab`, hero-card form sections. Prefer visible `<Label>` when there's room; fall back to `aria-label` for tight inline table cells.

### 3. Hero-card drop zone
Already has `role="button"`, `tabIndex={0}`, and Enter/Space `onKeyDown` (verified in `DesignAppearanceSection.tsx`). Remaining gaps to close:
- Add `aria-label="Upload flyer image"` on the drop-zone div (it currently has none).
- Add `aria-busy={isUploading}` and `aria-disabled={isUploading}` so screen readers know when it's inert.
- Ensure the hidden `<input type="file">` has an `aria-label` (the visible zone is the labeled control; label the file input as a fallback for AT that focuses it directly).

### 4. `aria-live` for score updates
Score-entry surfaces mutate on-screen values silently. Add polite live regions so SR users hear updates.
- `src/components/admin/scores/MatchScoresList.tsx` — wrap the list in `<div role="status" aria-live="polite" aria-atomic="false">` OR add a visually-hidden status node that announces "Score submitted for {teamA} vs {teamB}" after `onSubmitScore` resolves.
- `src/components/admin/mass-score-entry/` — same treatment on the summary row that updates after each entry.
- Prefer a small shared `<LiveRegion>` component under `src/components/ui/` so future score/submit flows can reuse it.

## Non-goals
- No visual redesign, no route or data-flow changes.
- No changes to services, hooks, or Supabase calls.
- No sweeping ARIA changes outside the four items above.

## Verification
1. `npm run typecheck && npm run lint` — clean.
2. `npm run test:file -- <touched test>` for any component with existing tests; then `npm run test:coverage` as the gate.
3. `npm run build` — passes.
4. Manual smoke: keyboard-tab through a clickable team logo (Enter navigates), hero-card drop zone (Enter/Space opens picker), submit a score with VoiceOver / NVDA on and confirm the announcement.
5. `e2e/a11y.spec.ts` axe scan — no new violations; ideally fewer.

## Rollout
Single PR ("PR 4.5 — A11y polish"). Small, reviewable diffs per file. No migrations, no data changes.
