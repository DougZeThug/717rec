

## Weighted GPA Calculation for Report Card

### Problem
Currently `calculateGPA` treats all 6 grades equally. Power Score (Overall) should carry more weight since it's the most important indicator of team strength.

### Proposed Weights
| Category | Weight | Rationale |
|----------|--------|-----------|
| Overall (Power Score) | 3x | Primary composite metric |
| Consistency (Win %) | 2x | Core performance indicator |
| Games (Game Win %) | 1.5x | Supporting metric |
| Offense (Sweep Rate) | 1x | Situational |
| Clutch (Game 3) | 1x | Situational |
| Schedule (SOS) | 1x | Context metric |

### Changes

**File: `src/utils/reportCardUtils.ts`**
- Update `calculateGPA` to accept an array of `{ grade, weight }` objects instead of plain grades
- Compute weighted average: `sum(gpa * weight) / sum(weights)`

**File: `src/hooks/useTeamReportCard.ts`** (both season and career blocks)
- Replace the `allGrades` array with weighted entries:
```typescript
const weightedGrades = [
  { grade: overall.grade, weight: 3 },
  { grade: consistency.grade, weight: 2 },
  { grade: games.grade, weight: 1.5 },
  { grade: offense.grade, weight: 1 },
  { grade: clutch.grade, weight: 1 },
  { grade: schedule.grade, weight: 1 },
];
```
- Pass to updated `calculateGPA(weightedGrades)`

