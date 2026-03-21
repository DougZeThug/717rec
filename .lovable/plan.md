

## Fix Report Card: Clutch Percentile Bug + Radar Chart Distortion

### Root Cause

Both issues stem from a single bug: **double multiplication of clutch win percentage**.

1. `calculateClutchRecord()` in `matchOutcomeUtils.ts` already returns `clutchWinPct` as a 0–100 value (line 51: `clutchWins / game3Matches * 100`)
2. `useTeamReportCard.ts` line 70 multiplies it by 100 again: `Math.round(clutchPct * 100)` → yielding **10,000** for a 100% clutch rate

This 10,000 value breaks the radar chart because the domain is `[0, 100]`. The clutch axis extends massively beyond the chart boundary, collapsing the visual representation of all other stats into a tiny sliver — making it look like "only one stat is shown."

### Fix

**File: `src/hooks/useTeamReportCard.ts`** (line 70)

Change:
```typescript
const clutchPercentile = teamClutchRecord.game3Matches > 0 ? Math.round(clutchPct * 100) : 50;
```
To:
```typescript
const clutchPercentile = teamClutchRecord.game3Matches > 0 ? Math.round(clutchPct) : 50;
```

Remove the `* 100` since `clutchWinPct` is already on a 0–100 scale. This single-line fix resolves both the incorrect "10000th" percentile display and the broken radar chart visualization.

