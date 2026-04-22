

## Plan: Show "Rematch" indicator on each match card in edit mode

### What admins will see

In edit mode, each match card already shows a red border + message when there's an **error** (e.g. duplicate team). This plan adds the same per-card treatment for **rematch warnings** so admins immediately see when the teams they just selected have already played each other this season — matching the indicator they get in preview mode.

For every editable match where the chosen teams have played before:
- A small amber **"Rematch"** badge appears in the card header (with a 🔁 icon and tooltip: "These teams have already played each other this season").
- An amber left border on the card (non-blocking, distinct from the red error border).
- The validation summary alert at the top of the list now also reports warning counts, e.g. *"Schedule is valid. 2 rematch warnings — review highlighted matches."*

Selecting a different opponent updates the indicator within ~1s (the existing `useEditableMatches` validation effect already re-runs `validateMatchSchedule` on every change, which calls `haveTeamsPlayedBefore` — no extra fetching needed).

### Technical changes

The pipe is already in place: `useEditableMatches` runs `validateMatchSchedule`, which produces `validation.warnings` containing `{ matchId, type: 'rematch', message }`. Today only `validation.errors` are surfaced per card. We just need to surface `validation.warnings` too.

**1. `src/components/admin/auto-schedule/EditableMatchList.tsx`**
- Add a `getMatchWarning(matchId)` lookup mirroring the existing `getMatchError`, returning the first warning whose `matchId` matches.
- Pass `hasWarning` and `warningMessage` props down to `EditableMatchCard`.
- Update the top summary `Alert` to mention warning count when `validation.isValid && warnings.length > 0` (use `default` variant with an amber tint or the existing default styling).

**2. `src/components/admin/auto-schedule/EditableMatchCard.tsx`**
- Extend props with optional `hasWarning?: boolean` and `warningMessage?: string`.
- Apply an amber border (`border-amber-400` / dark equivalent) when `hasWarning && !hasError` — error border still wins when both are present.
- Above the team selectors, render a small badge row when `hasWarning`:
  ```tsx
  {hasWarning && !hasError && (
    <div className="mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
      <RotateCcw className="h-4 w-4" />
      <span>{warningMessage ?? 'Rematch — these teams have already played'}</span>
    </div>
  )}
  ```
- Use the existing `Badge` component for visual consistency with other warning chips in the app.

**3. No changes needed to:**
- `useEditableMatches.ts` — already produces warnings.
- `validation.ts` — `checkForRematches` already populates them.
- `MatchesTab.tsx` / `ScheduleWorkflowTabs.tsx` / `AutoScheduleTab.tsx` — `validation` is already threaded through.

### Files touched

- Edit: `src/components/admin/auto-schedule/EditableMatchList.tsx` — surface warnings, expand summary alert.
- Edit: `src/components/admin/auto-schedule/EditableMatchCard.tsx` — accept + render warning indicator.

### Verification

1. Open Admin → Batch Match Creation → Auto Schedule → generate a schedule → toggle **Edit** mode.
2. In any match card, change one team's opponent to a team they've already played this season → within a moment, an amber "Rematch" badge and amber border appear on that card.
3. Change to a fresh opponent → badge disappears.
4. Cards with both an error (e.g. duplicate team in same timeslot) and a rematch still show the red error styling/message; rematch indicator is suppressed to avoid noise.
5. Top summary alert reflects "X rematch warnings" when applicable.

### Rollback

Revert the two files. One step. The validation pipeline is unchanged.

