

## Tiered Rivalry Labels

### What Changes

Replace the single "Dominated" and "Nemesis" labels with two tiers each, adding softer intermediate labels for matchups that are lopsided but not extreme.

### New Tiers

| Win % Range | Old Label | New Label | Visual Style |
|---|---|---|---|
| 83%+ | Dominated | **Dominated** | Emerald (strong) |
| 70-82% | Dominated | **Favorite** | Teal (softer) |
| 18-30% | Nemesis | **Tough Matchup** | Orange-red (softer) |
| Below 18% | Nemesis | **Nemesis** | Red (strong) |
| Near .500 | Rival | **Rival** (unchanged) | Amber |

### Files to Change

**1. `src/utils/teamDetailsUtils/rivalryUtils.ts`** (core logic)
- Expand `RivalryType` to `'rival' | 'dominated' | 'favorite' | 'nemesis' | 'tough_matchup'`
- Update `classifyRivalries`:
  - `dominantMatchups` uses 70% threshold (catches both tiers)
  - `nemeses` uses 30% threshold (catches both tiers)
- Update `getRivalryType` with the 4 tiers:
  - 83%+ = `'dominated'`, 70-82% = `'favorite'`
  - below 18% = `'nemesis'`, 18-30% = `'tough_matchup'`
- Update `getRivalryLabel` with appropriate wording for each tier

**2. `src/components/teams/RivalryHighlights.tsx`** (team page cards)
- Show "Favorite" with a softer teal style when the top dominant matchup is 70-82%
- Show "Tough Matchup" with orange-red style when nemesis is 18-30%
- Pick the strongest available opponent for each card slot

**3. `src/components/stats/HeadToHeadRecords.tsx`** (H2H table badges)
- Add badge configs for `favorite` and `tough_matchup`
- Favorite: teal badge styling
- Tough Matchup: orange badge styling

**4. `src/components/schedule/MatchHeadToHead.tsx`** (schedule match cards)
- Update the inline `getRivalryTag` function with the same 4-tier thresholds
- Add "Favorite" (teal) and "Tough Matchup" (orange-red) tag styles

### Technical Details

Threshold constants (added to `rivalryUtils.ts`):
```text
dominated:    win_pct >= 83
favorite:     win_pct >= 70 && win_pct < 83
tough_matchup: win_pct > 18 && win_pct <= 30
nemesis:      win_pct <= 18
```

All thresholds still require `matches_played >= 3` to avoid labeling small samples.

