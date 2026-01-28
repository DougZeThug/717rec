# Power Score System

The Power Score is 717REC's team ranking metric that combines win rate, game performance, and strength of schedule into a single normalized value.

## Scale and Storage

| Context | Scale | Example |
|---------|-------|---------|
| Database (`team_season_stats`) | 0-1 | `0.858` |
| View (`v_team_details`) | 0-100 | `85.8` |
| UI Display | 0-100 | `85.8` |

The `normalizePowerScore()` utility handles conversion between these scales.

## Calculation Formula

Power Score is calculated by the `update_team_stats` RPC function in the database:

```
Power Score = (Win% × 0.4) + (Game Win% × 0.3) + (SOS × 0.3)
```

Where:
- **Win%**: Match win percentage (matches won / matches played)
- **Game Win%**: Individual game win percentage across all matches
- **SOS (Strength of Schedule)**: Average power score of opponents faced

## Data Flow

```
Match Results → update_team_stats RPC → team_season_stats (0-1)
                                              ↓
                                    v_team_details view (0-100)
                                              ↓
                                    UI Components (displayed as 85.8)
```

## Utilities in This Directory

| File | Purpose |
|------|---------|
| `normalizePowerScore.ts` | Converts between 0-1 and 0-100 scales |
| `getTrendingTeams.ts` | Finds teams with biggest recent power score gains |

## Related Code

- `src/integrations/supabase/types.ts` - Database type definitions
- `v_team_details` view - Aggregates team stats with normalized power score
- `update_team_stats` RPC - Core calculation logic (in database)
