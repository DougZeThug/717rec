# Power Score Fix Summary

## Problem

The History page and Current Season (Stats) page were calculating power scores using **different formulas**:

- **Stats Page**: Used **weighted** formula where opponent strength affects win percentages
- **History Page**: Used **simple** formula where all wins count equally

This caused the same team in the same season to show different power scores on different pages.

## Solution

Updated the database view `v_team_season_agg` (migration: `20260112170000_fix_history_weighted_powerscore.sql`) to use the **same weighted formula** as the Current Season view.

## What Changed

### Before (Simple Formula)
```sql
power_score =
  (0.40 * match_wins / total_matches) +
  (0.45 * strength_of_schedule) +
  (0.15 * game_wins / total_games)
```

All wins counted equally, regardless of opponent strength.

### After (Weighted Formula)
```sql
power_score =
  (0.40 * SUM(wins * opponent_division_weight) / total_matches) +
  (0.45 * strength_of_schedule) +
  (0.15 * SUM(game_wins * opponent_division_weight) / total_games)
```

Wins are now weighted by opponent division strength:
- Competitive division: weight = 1.00
- Intermediate division: weight = 0.70
- Recreational division: weight = 0.85 (default)

## Impact

- Teams that beat **stronger opponents** will now have **higher** power scores on the History page
- Teams that beat **weaker opponents** will now have **lower** power scores on the History page
- Power scores will now be **consistent** across all views
- Historical data will be **recalculated** automatically when the migration runs

## Example

**Team: "Miracle @ Marion"** (2-0 record)

| View | Old Score | New Score | Change |
|------|-----------|-----------|--------|
| Stats Page | 65.48 | 65.48 | No change |
| History Page | 82.40 | 65.48 | -16.92 (corrected) |

This team's history page score was inflated because both wins were against Intermediate teams (weight 0.70), but the old formula counted them as full wins.

## Files Changed

1. **Migration**: `supabase/migrations/20260112170000_fix_history_weighted_powerscore.sql`
   - Updates `v_team_season_agg` view
   - Recalculates all historical power scores

2. **Documentation**:
   - `REAL_POWERSCORE_BREAKDOWN.md` - Diagnostic document (now marked as FIXED)
   - `POWERSCORE_FIX_SUMMARY.md` - This summary

## Technical Details

The fix adds two new CTEs to the view:

1. **weighted_match_wins**: Calculates `SUM(match_wins * opponent_division_weight) / COUNT(*)`
2. **weighted_game_wins**: Calculates `SUM(game_wins * opponent_division_weight) / SUM(total_games)`

These replace the simple division calculations in the power score formula.

---

*Fixed: 2026-01-12*
