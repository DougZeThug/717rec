

## Update Rivalry Thresholds and Highlight Sorting

### What Changes

**Badges (H2H table + schedule cards):** Nemesis and Dominated use percentage-based thresholds with 3-match minimum:
- **Nemesis**: win_pct <= 25%, 3+ matches
- **Dominated**: win_pct >= 75%, 3+ matches

**Rivalry Highlights cards:** The top dominated/nemesis are chosen by highest/lowest win percentage (not just unbeaten/winless).

### Technical Details

**1. `src/utils/teamDetailsUtils/rivalryUtils.ts`**

`classifyRivalries()`:
- `dominantMatchups` filter: `matches >= 3 && win_pct >= 75` — sort by `win_pct desc`, then `matches_played desc`
- `nemeses` filter: `matches >= 3 && win_pct <= 25` — sort by `win_pct asc`, then `matches_played desc`
- Update JSDoc comments on `RivalryResults` interface

`getRivalryType()` (drives badge display):
- Nemesis: `matches_played >= 3 && win_pct <= 25`
- Dominated: `matches_played >= 3 && win_pct >= 75`
- Rival: unchanged

`getRivalryLabel()`:
- Nemesis and Dominated now show actual W-L (e.g. "1-5 all-time") instead of hardcoded "0-X" or "X-0"

**2. `src/components/schedule/MatchHeadToHead.tsx`**

Update inline `getRivalryTag()`:
- Nemesis: either team's win rate <= 25% with 3+ matches (replace the `=== 0` checks)
- Add green "Dominated" tag when either team's win rate >= 75% with 3+ matches

**3. `src/components/teams/RivalryHighlights.tsx`**

- Update sublabels to use `${wins}-${losses}` instead of hardcoded `${wins}-0` / `0-${losses}`, since top picks may no longer be unbeaten/winless

No other files need changes — `HeadToHeadRecords.tsx` already consumes `getRivalryType()` and will automatically reflect the new thresholds.

