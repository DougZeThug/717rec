# Auto-Scheduler Documentation

## Overview

The auto-scheduler system supports two scheduling modes to accommodate different league formats and requirements.

## Scheduling Modes

### 1. Dual Match Mode (Greedy Back-to-Back Scheduler)

**When to use:** League nights where each team plays TWO consecutive matches in back-to-back timeslots.

**Algorithm:** Greedy Back-to-Back Scheduler (`src/utils/scheduling/greedy/`)

**Features:**
- Each team gets exactly 2 matches in consecutive slots (S1 and S2)
- Fast O(N²) greedy selection algorithm
- Deterministic output (same input = same result every time)
- Prioritizes same-division pairings first, then adjacent tiers
- Strict no-rematch enforcement based on season history
- Handles odd-team nights by creating a third slot (S3)

**Odd Team Handling:**
When there's an odd number of teams:
1. **Bye1** sits out Slot 1, plays in Slot 2 + Slot 3
2. **Bye2** sits out Slot 2, plays in Slot 1 + Slot 3
3. Slot 3 is created specifically for Bye1 vs Bye2
4. All other teams play in Slot 1 + Slot 2

**Constraints:**
- Maximum tier gap: 1 (prevents T1 vs T3+ matchups)
- No season rematches (teams that played before)
- No session rematches (can't play same opponent twice tonight)
- Division priority: Same division > Adjacent tier > Never extreme gaps

**Performance:**
- Generation time: <100ms for 20 teams
- Predictable and debuggable
- No quality optimization needed

**UI Setting:** Enable "Dual Match Mode" toggle

---

### 2. Standard Mode (Blossom Algorithm)

**When to use:** Single time block scheduling where teams play once per night.

**Algorithm:** Edmonds' Blossom Algorithm (`src/utils/autoSchedule/blossom/`)

**Features:**
- Optimal maximum weight matching
- Compatibility score by division: 10 for the same division, 5 for neighbouring divisions, 0 for Competitive against Recreational (blocked)
- With "Prioritize Match Quality" ON, a small skill term is taken off that score (see Quality Optimization)
- Each time block scheduled independently
- With "Prioritize Match Quality" ON, prefers teams with a close Power Score, strength of schedule, win record and game record. For each pair the division score counts first

**Quality Optimization:**
This works in Standard mode only. Dual Match Mode does not read the weights.

The switch is ON when the screen sends weights. Both screens send the same four
fixed numbers. No screen lets the admin change them. They are not the Power Score
weights (40/45/15) and not the division weights.
- `powerScoreWeight`: 5 - Balance team power scores
- `sosWeight`: 3 - Consider strength of schedule
- `recordWeight`: 3.5 - Match teams with similar records
- `gameRecordWeight`: 2 - Match teams with similar game records

The Auto Schedule tab sends them from
`src/hooks/useAutoSchedule/usePairingOperations.ts:182-189`. The batch matches
screen sends the same four from
`src/components/admin/batch-matches/auto-schedule/hooks/useAutoScheduleSection.ts:81-91`.
(Before 2026-11-17 the batch screen sent only `powerScoreWeight` 5 and
`recordWeight` 3.5.) No screen sends a `divisionWeight` (the `CompatibilityWeights`
type in `src/types/autoSchedule.ts:22` still has an optional one).

How the weights are used (`src/hooks/scheduling/utils/standardPairing.ts`):
- **Switch OFF** (no weights): every pair is scored by
  `calculateDivisionOnlyCompatibility`: 10 for the same division, 5 for
  neighbouring divisions, 0 for Competitive against Recreational. Nothing extra is
  read. This is the same as before the switch worked.
- **Switch ON** (weights sent): Generate reads the real ratings of every team in
  the blocks from `v_team_details`, once. The scheduler's own team objects hold
  placeholders (Power Score 0, strength of schedule 0.5), so the real numbers are
  kept in a separate map inside the score function. `createQualityCompatibility`
  in `src/utils/autoSchedule/compatibilityUtils.ts` then scores each pair as the
  division score minus 0.5 x gap squared, rounded to the nearest 1/256. The gap is
  0 to 1: a weighted average of four distances (Power Score over 100, strength of
  schedule, win rate, game win rate). A distance is skipped when either team has no
  data for it (Power Score null or 0, or no decided matches).
- **For each pair the division score counts first, and the skill term is small.**
  The skill term takes at most 0.5 off a pair. A pair from the same division stays
  between 9.5 and 10. A pair from neighbouring divisions stays between 4.5 and 5. A
  blocked pair stays 0. The skill term comes off every pair, so it also sways the
  choice between cross-division pairings. With ON each round first pairs as many
  teams as it can, then division, then skill. For blocks of 20 or more teams the
  skill terms of one round could add up past one division step. That is not guarded.
  Real block sizes are UNKNOWN. Some mixed blocks force a cross-division pair under
  both settings.
- **Every round pairs as many teams as it can (ON only).** With the switch ON,
  `standardPairing.ts` passes `preferFullRounds` to the generator. Its first run
  then matches as many teams as it can in each round, so a smaller round never wins,
  even if its pairs score higher. With OFF the flag is false and the first
  run is the one it always was. This first run uses the vendored copy of the
  library (`blossom/vendor/`), like the retry does. Dual Match Mode does not use
  the flag.
- **If the ratings cannot be read**, Generate stops and shows: "Could not load the
  team ratings that Prioritize Match Quality needs. Turn off Prioritize Match
  Quality and try again."
- **A visible effect:** with the switch ON, a pair from neighbouring divisions
  whose teams are not close scores a little under 5 (a weighted gap under about 6%
  rounds away, so very close teams still score exactly 5). The preview shows it
  with the amber note "may not be evenly matched". The red "N Warnings" badge does
  not count these pairs. With ON or OFF it counts only rematches and forbidden
  pairs (score under 4.5, which means 0). The card prints a score under 5 cut to
  two decimals, for example 4.99, so it never reads 5.0. An average of exactly 8.0
  can read 7.97.
- **What the seeded test grid shows** (`standardPairing.qualityGrid.test.ts`: blocks
  of 6, 8, 10 and 12 teams, three tier mixes, 40 seeded blocks each, three library
  modes). A list is "good" when no pair bends a rule (Competitive against
  Recreational, or a repeated pair unless both teams are Recreational) and Apply can
  place it into the block's two time slots. In 9 of the 12 tested cases ON found a
  good list in all 40 blocks (360 of 480 blocks). OFF found 268, 293 and 321 of the
  same 480 in the three library modes (the OFF totals were reproduced by QA-C in a
  throwaway copy; they are not pinned by a test). In 2 cases no good list exists (3
  Competitive, 1 Intermediate and 2 Recreational teams at 6 teams, and 5, 1 and 2 at 8
  teams). In 1 case one exists but neither setting finds it (2 Competitive, 2
  Intermediate and 2 Recreational teams at 6 teams). The tests use random ratings and
  6 to 12 teams. Real block sizes are UNKNOWN. In no seeded block did ON give a bad
  list where OFF gave a good one.
- **Where no good list exists, a rule bends under both settings, and ON is not always
  better.** ON stops less often than OFF overall (blocks of 8 teams with 5
  Competitive, 1 Intermediate and 2 Recreational teams: 2 stops against 11 in the
  plain library). Two things go the other way. In blocks of 6 teams with 3
  Competitive, 1 Intermediate and 2 Recreational teams, ON can bend more
  rules than OFF (34 against 21 bent pairs in the plain library), because OFF has 19
  of 40 lists that Apply cannot place into the two time slots (ON has 6). And in 1 of
  40 blocks of 8 teams with 5 Competitive, 1 Intermediate and 2 Recreational teams, ON
  stopped where OFF finished (the admin sees a red error toast).

The old scorers `calculateTeamCompatibility` and
`calculateConfigurableCompatibility` (deprecated) are not used by the Standard
path. `calculateConfigurableCompatibility` is reached only through
`generateDualBlockPairings`, which has no production caller.

**Constraints:**
- Configurable rematch avoidance
- Flexible tier gap limits
- Compatibility score maximization

**Performance:**
- Generation time: O(N³) - slower but optimal
- Non-deterministic (can vary slightly between runs)
- Best for quality-focused scheduling

**UI Setting:** Disable "Dual Match Mode" toggle

---

## Configuration

### Algorithm Settings (UI)

**Dual Match Mode:**
- Toggles between greedy (ON) and Blossom (OFF) schedulers
- Hides the "Prioritize Match Quality" switch while Dual Match Mode is ON (Dual does not read the weights)

**Avoid Rematches:**
- Both modes: Prevents scheduling teams that played in current season
- Greedy: Strict enforcement (never allows rematches)
- Blossom: Soft constraint (prefers non-rematches but may allow if needed)

**Prioritize Match Quality:**
- Only available in Standard Mode (Blossom)
- Hidden when Dual Match Mode is enabled
- Sends four fixed weights. Standard mode reads them (see Quality Optimization). Dual Match Mode does not

---

## Code Structure

### Core Files

**Greedy Scheduler:**
- `src/utils/scheduling/greedy/` - Main algorithm
- `src/utils/scheduling/__tests__/greedyBackToBackScheduler.test.ts` - Unit tests

**Blossom Scheduler:**
- `src/utils/autoSchedule/blossom/` - Main algorithm

**Integration:**
- `src/hooks/scheduling/usePairingGenerator.ts` - Hook that switches between algorithms
- `src/hooks/useAutoSchedule/` - Higher-level scheduling hooks

**UI Components:**
- `src/components/admin/auto-schedule/DateSettingsPanel.tsx` - Date & settings panel
- `src/components/admin/batch-matches/auto-schedule/components/AlgorithmSettings.tsx` - Batch settings

### Data Flow

```
User selects date & settings
    ↓
Load teams from team_timeslots table (the load date is remembered)
    ↓
Generate is blocked if the date changed since teams were loaded
    ↓
usePairingGenerator.generateMatchPairings()
    ↓
    ├─→ config.dualMatchMode = true
    |       ↓
    |   generateScheduleGreedy()
    |       - Flatten teams
    |       - Fetch season history
    |       - Generate S1, S2, (S3) pairings
    |       - Return ScheduledMatch[]
    |
    └─→ config.dualMatchMode = false
            ↓
        generatePairingsWithBlossom()
            - Build weighted graph
            - Run Blossom matching
            - Return TeamPairing[]
    ↓
Convert to TeamPairingMap
    ↓
Calculate quality metrics
    ↓
Display preview & apply to database
```

### Date staleness guards

Team lists are specific to the selected date, so three checks stop a schedule
from being built or saved against the wrong day:

- **Generate** refuses to run when the date picker moved after teams were
  loaded ("Teams Out of Date") — reload teams for the new date first.
- **Apply** refuses to run when the pairings on screen were generated for a
  different date ("Schedule Stale") — regenerate first.
- **Save** (edit mode and the Export tab) refuses to write matches that were
  applied for a different date ("Schedule Stale"). Each match carries the date
  it was applied for, while the save writes on the date picker's day — pick
  that date again, or regenerate first.

---

## Testing

### Greedy Scheduler Tests

Run tests: `npm test greedyBackToBackScheduler`

**Coverage:**
- Even team counts (10 teams → 5+5 matches)
- Odd team counts (9 teams → 4+4+1 matches)
- History constraints (no rematches)
- Tier gap limits (no T1 vs T3)
- Division prioritization
- Deterministic output

### Blossom Scheduler Tests

Run tests: `npm test blossomPairingAlgorithm`

**Coverage:**
- Compatibility scoring (division only)
- Rematch avoidance
- Unmatched team handling

Prioritize Match Quality (switch ON) has its own tests. Run `npm test compatibilityUtils.quality`
for the score function, and `npm test standardPairing.quality` for the wiring, the real
generator, and the seeded ON-versus-OFF grid.

---

## Migration Notes

The greedy scheduler was introduced to handle the specific back-to-back scheduling requirement:
- Replaced complex dual-block logic with simple greedy algorithm
- Maintained Blossom for standard single-block scheduling
- UI updated to hide the quality switch in dual match mode (Dual does not read the quality weights)
- Both algorithms coexist for different use cases

**Before:** All scheduling used Blossom (slower, quality-focused)
**After:** Dual match uses Greedy (fast, deterministic), Standard uses Blossom (optimal quality)

---

## Future Enhancements

Possible improvements:
1. Add configurable tier gap limits to UI
2. Support for more than 2 consecutive matches
3. Advanced bye team selection strategies
4. Real-time preview during configuration
5. Schedule optimization for venue/court constraints
