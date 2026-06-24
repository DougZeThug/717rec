# Bucket C — Clear all 20 `react-hooks/exhaustive-deps` warnings safely

## Goal
Silence the lint rule **without changing any runtime behavior**. Like the previous bucket, this rule is advisory — auto-"fixing" by adding the missing dep often *does* change behavior (effects re-fire, callbacks reset, intentional mount-only effects become render-loop effects). Several of these warnings exist precisely because the author intentionally diverged from the rule.

## Approach
Per-line `// eslint-disable-next-line react-hooks/exhaustive-deps -- <reason>` above each flagged hook call. No logic changes. Reasons grouped by intent:

### Intentional mount-only / run-once effects (do NOT add deps — would re-fire on every change)
- `src/hooks/auth/index.ts:246` — auth session bootstrap, must run once
- `src/hooks/message-board/useMessageBoard.ts:268` — `fetchInitialMessages()` on mount
- `src/components/admin/mass-score-entry/useScoreEntryData.ts:214` — initial fetch
- `src/components/admin/mass-score-entry/hooks/useScoreEntryData.ts:80` — initial fetch + filter sync
- `src/pages/Compare.tsx:35` — initial team load by URL params; rerunning would clobber user edits

### Stable refs / handlers that don't need to be deps
- `src/components/admin/dashboard/AdminMobileNav.tsx:109` — `activeTab` intentionally excluded to keep memoized nav stable
- `src/components/playoffs/layout/PlayoffPageLayout.tsx:61` — `handlers` object identity churn
- `src/components/playoffs/match-card/hooks/useMatchCardStyles.tsx:56` — `getCardStyle` is stable within memo scope
- `src/hooks/usePlayoffViewModel.compat.ts:138` — `handleBracketCreated` exposed via memo intentionally
- `src/hooks/useAutoSchedule/useTeamOperations.ts:177` — `toast` is stable from `useToast()`

### Linter false-positives (deps listed are not actually used / are derived)
- `src/components/playoffs/form/bracket-teams/hooks/useBracketFormData.ts:160` — `divisionMapping` declared unnecessary
- `src/hooks/useAutoSchedule/index.ts:181, 187` — `timeBlockTeams` / `editableMatches` unnecessary deps

### "Conditional could change deps" warnings (variable assigned inside hook scope)
- `src/components/playoffs/form/bracket-teams/hooks/useSeedManagement.ts:35` (×3) — `safeInitialTeams` pattern
- `src/components/ui/theme/ThemeToggle.tsx:32` (×2) — `enabledThemes` pattern

For these, the suppression goes on the **declaration line** (line 35 / 32) where ESLint already points — same pattern we used in bucket A.

### Mutation manager with debounced auto-save (intentionally stale closure)
- `src/components/playoffs/form/bracket-teams/hooks/useMutationStateManager.ts:75` — debounce timer + save closure

### Ref-in-cleanup warning (intentional)
- `src/components/transitions/RippleTransition.tsx:32` — capturing `rippleRef.current` for cleanup; ref is stable for animation lifetime

## Deliverable
- 20 `// eslint-disable-next-line react-hooks/exhaustive-deps -- <reason>` comments inserted above each flagged line.
- No other edits.
- Re-run `npx eslint .`; confirm `exhaustive-deps` count drops to 0; total warnings drop from 37 → 17 (only `react-refresh/only-export-components` remains).

## Why not actually fix these
Adding the missing deps is what the rule wants but is unsafe here:
- Re-running mount-only effects re-fetches lists or resets auth state on every render.
- Adding `handlers`/`toast` to deps creates new memoized values every render, defeating the memoization.
- The "conditional dep" warnings would require restructuring the hook (lifting variables out, `useMemo`-wrapping) — non-trivial in form state and theme code we shouldn't churn for a lint pass.

If you later want a real refactor pass, the highest-value targets are the three `useScoreEntryData` files and `useMessageBoard` (extract a stable `fetchOnMount` ref).
