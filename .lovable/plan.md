

## Fix: Rename single-letter variables in greedyBackToBackScheduler.ts

### What's wrong

The repair loop in the greedy scheduler uses `A`, `B`, `C`, `D` as variable names for teams. These are flagged as anti-pattern (JS-C1002: variable name too small).

### Fix

**File:** `src/utils/scheduling/greedyBackToBackScheduler.ts` (lines 913-931)

| Line | Current | Change to |
|------|---------|-----------|
| 913 | `const A = teamMap.get(m1.teamAId)` | `const teamA = teamMap.get(m1.teamAId)` |
| 914 | `const B = teamMap.get(m1.teamBId)` | `const teamB = teamMap.get(m1.teamBId)` |
| 915 | `if (!A \|\| !B) continue` | `if (!teamA \|\| !teamB) continue` |
| 923 | `const C = teamMap.get(m2.teamAId)` | `const teamC = teamMap.get(m2.teamAId)` |
| 924 | `const D = teamMap.get(m2.teamBId)` | `const teamD = teamMap.get(m2.teamBId)` |
| 925 | `if (!C \|\| !D) continue` | `if (!teamC \|\| !teamD) continue` |
| 928-931 | References to `A, B, C, D` in rearrangements array | Update to `teamA, teamB, teamC, teamD` |

All downstream references to these variables in the same block also get renamed.

### Scope

One file, rename-only. No logic changes.

