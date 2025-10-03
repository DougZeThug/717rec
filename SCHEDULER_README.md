# Auto-Scheduler Documentation

## Overview

The auto-scheduler system supports two scheduling modes to accommodate different league formats and requirements.

## Scheduling Modes

### 1. Dual Match Mode (Greedy Back-to-Back Scheduler)

**When to use:** League nights where each team plays TWO consecutive matches in back-to-back timeslots.

**Algorithm:** Greedy Back-to-Back Scheduler (`src/utils/scheduling/greedyBackToBackScheduler.ts`)

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

**Algorithm:** Edmonds' Blossom Algorithm (`src/utils/autoSchedule/blossomPairingAlgorithm.ts`)

**Features:**
- Optimal maximum weight matching
- Configurable compatibility scoring
- Supports quality optimization weights
- Each time block scheduled independently
- Can prioritize team skill balance

**Quality Optimization:**
When "Prioritize Match Quality" is enabled:
- `powerScoreWeight`: 1.5 - Balance team power scores
- `sosWeight`: 1.0 - Consider strength of schedule
- `recordWeight`: 1.0 - Match teams with similar records
- `divisionWeight`: 2.0 - Favor same-division pairings

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
- Shows/hides quality optimization when appropriate

**Avoid Rematches:**
- Both modes: Prevents scheduling teams that played in current season
- Greedy: Strict enforcement (never allows rematches)
- Blossom: Soft constraint (prefers non-rematches but may allow if needed)

**Prioritize Match Quality:**
- Only available in Standard Mode (Blossom)
- Hidden when Dual Match Mode is enabled
- Applies quality weights to favor balanced matchups

---

## Code Structure

### Core Files

**Greedy Scheduler:**
- `src/utils/scheduling/greedyBackToBackScheduler.ts` - Main algorithm
- `src/utils/scheduling/__tests__/greedyBackToBackScheduler.test.ts` - Unit tests

**Blossom Scheduler:**
- `src/utils/autoSchedule/blossomPairingAlgorithm.ts` - Main algorithm
- `src/utils/autoSchedule/pairingAlgorithm.ts` - Legacy version

**Integration:**
- `src/hooks/usePairingGenerator.ts` - Hook that switches between algorithms
- `src/hooks/useAutoSchedule/` - Higher-level scheduling hooks

**UI Components:**
- `src/components/admin/auto-schedule/AlgorithmSettings.tsx` - Settings accordion
- `src/components/admin/auto-schedule/DateSettingsPanel.tsx` - Date & settings panel
- `src/components/admin/batch-matches/auto-schedule/components/AlgorithmSettings.tsx` - Batch settings

### Data Flow

```
User selects date & settings
    ↓
Load teams from team_timeslots table
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
- Quality optimization
- Compatibility scoring
- Rematch avoidance
- Unmatched team handling

---

## Migration Notes

The greedy scheduler was introduced to handle the specific back-to-back scheduling requirement:
- Replaced complex dual-block logic with simple greedy algorithm
- Maintained Blossom for standard single-block scheduling
- UI updated to hide quality optimization in dual match mode
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
