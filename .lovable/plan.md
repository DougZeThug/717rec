## What's actually happening

The message "10 out of 26 teams have matches in both time blocks. 16 team(s) only play in one time block." is **misleading** — it's not measuring what its wording suggests, and in your schedule it's also being computed from incomplete data.

### Bug #1 — only the first two time blocks are inspected

In `src/components/admin/auto-schedule/tabs/MatchesTab.tsx` (lines 76–88), the dual-match metrics are calculated like this:

```ts
const blocks = Object.keys(generatedPairings);
const primaryBlockPairings   = generatedPairings[blocks[0]] || [];
const secondaryBlockPairings = generatedPairings[blocks[1]] || [];
return calculateDualBlockMetrics(primaryBlockPairings, secondaryBlockPairings);
```

It hard-codes `blocks[0]` and `blocks[1]` — meant for the simple "Early 6:30 / Late 7:00" case. If your schedule has **more than two time blocks** (e.g., 6:30, 7:00, 7:30, …), all pairings in blocks[2]+ are silently ignored when computing the metric. Teams whose two matches happen to live in those ignored blocks get counted as having only one match, which is exactly the "16 teams only play in one time block" you're seeing.

The same truncation happens for `validateDualBlockSchedule` right below it (lines 91–102).

### Bug #2 — the metric counts "matches scheduled" not "matches across both blocks"

`calculateDualBlockMetrics` in `src/utils/autoSchedule/dualBlock/metricsUtils.ts` defines:

- `teamsWithBothMatches` = teams whose total `matchCount === 2`
- `teamsWithSingleMatch` = teams whose total `matchCount === 1`

It never checks **which** block each pairing belongs to. So a team playing twice inside the same time block (a double-header within one block) would still be reported as "has matches in both time blocks", and a team playing in 3 blocks would be reported as neither. The UI label and warning copy don't match what the number actually represents.

## Plan to fix

Two small, focused changes — UI/presentation only, no scheduler logic touched.

### 1. Aggregate metrics across all blocks, not just the first two

`src/components/admin/auto-schedule/tabs/MatchesTab.tsx`

- Replace the `blocks[0]` / `blocks[1]` slice with all pairings flattened across every block, OR pass the full `generatedPairings` map into the metrics/validation helpers.
- Simplest, lowest-risk option: keep the existing two-argument signature, but pass `primary = generatedPairings[blocks[0]]` and `secondary = pairings from every other block concatenated`. This restores the intended semantics (one "anchor" block vs. everything else) without changing any helper.
- Same change applied to the `dualBlockValidation` memo right below.

### 2. Track block membership properly inside the metric

`src/utils/autoSchedule/dualBlock/metricsUtils.ts`

- In `processBlockPairing`, also record **which block** each team appeared in (e.g., a `Set<string>` of block IDs per team).
- Recompute:
  - `teamsWithBothMatches` → teams whose recorded block set has size ≥ 2
  - `teamsWithSingleMatch` → teams whose recorded block set has size === 1
- Existing fields (`teamsWithDuplicateOpponents`, `averageCompatibilityScore`, `crossBlockCompatibility`, `blockBalanceScore`, `overallQualityScore`) keep their current formulas.
- Update the existing unit tests in `src/utils/autoSchedule/dualBlock/__tests__/metricsUtils.test.ts` that assert on `matchCount === 2` semantics so they reflect "appeared in N distinct blocks" semantics. Add one new test: a team that plays twice inside the **same** block should be counted as `teamsWithSingleMatch`, not `teamsWithBothMatches`.

### 3. (Optional, cosmetic) Tighten the warning copy

`src/components/admin/auto-schedule/DualMatchWarningDisplay.tsx` lines 83–88 — once the metric is accurate, the wording "have matches in both time blocks" / "only play in one time block" is correct. No copy change needed if steps 1 and 2 land. If you'd rather keep the metric as a pure "match count" check, we'd instead reword the alert to "have 2 matches scheduled" / "have only 1 match scheduled" and skip step 2.

## How you'll verify

1. Run the scheduler with your normal schedule — the alert should either disappear (turning into the green "Optimal Dual Match Schedule") or show numbers that actually match what you see in the match list.
2. Updated unit tests for `calculateDualBlockMetrics` pass.

## Question before I implement

Do you want the metric to be **strictly "appeared in 2+ distinct time blocks"** (recommended — matches the current wording), or **"has 2 matches scheduled regardless of block"** (in which case I'll just reword the warning)?
