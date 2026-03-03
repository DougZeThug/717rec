

## Audit Result: Dead Interface Fields in `src/types/*.ts`

After cross-referencing every field in the main TypeScript interfaces against actual usage across the codebase, there is **one dead field** to remove.

### Dead Field Found

| Interface | File | Field | Why it's dead |
|---|---|---|---|
| `Team` | `src/types/index.ts` (line 16) | `challongeParticipantId?: number` | Declared but never read or written anywhere in the codebase. No query populates it, no component accesses it. Legacy from a Challonge integration that was removed. |

### Fields Verified as Alive

These were investigated but confirmed to be actively used:

- **`Team.division`** — used as fallback in 4+ files (`teamGrouping.ts`, `compatibilityUtils.ts`, `useBracketFormData.ts`)
- **`Team.seed`** — used extensively in bracket/playoff components (18 files)
- **`Match.timeSlot`** — used in match creation and scheduling (24 files)
- **`Match.team1Details` / `team2Details`** — populated by join queries, used in 11 files
- **`Match.match_type`** — populated from DB, used in 7 files
- **`BracketRecord.challonge_tournament_id`** — still referenced in bracket creation and queries

### Change

**`src/types/index.ts`** — Remove line 16 (`challongeParticipantId?: number;`) from the `Team` interface.

One line removed. No other code changes needed since no code references this field.

