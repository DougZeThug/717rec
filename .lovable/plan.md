

## Remove Redundant Champion Selection from Archive Dialog

The archive dialog's Champion/Runner-up/Third Place dropdowns are legacy UI from before the automated bracket-based detection was built. They serve no purpose now — the RPC already:
- Detects each division's champion from `wb_champion_id` on each bracket
- Assigns ranks 1-3+ from bracket data
- Awards championship badges per division

### Changes

| What | Change |
|---|---|
| `SeasonArchivalDialog.tsx` | Remove all three team selection dropdowns (Champion, Runner-up, Third Place). Keep the warning panel and Archive button. Remove the `useTeamsArray` import since it's no longer needed. Pass empty/null values for the three params to the RPC (the RPC ignores them when null — it uses bracket data instead). |
| `SeasonsList.tsx` | Remove the `champion_team_id` conditional badge — archival status already indicates champions were recorded. |
| `useSeasonMutations.ts` | Simplify the `ArchiveSeasonData` interface to just `{ id: string }` since the three optional team IDs are no longer passed from the UI. Still pass nulls to the RPC so the function signature doesn't need changing. |

No database or RPC changes needed — the RPC already handles null values for these params and falls back to auto-detection from bracket data.

