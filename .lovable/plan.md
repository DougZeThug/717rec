

## Seed Recreational Winter 1 2026 Playoff Matches

### Summary
Insert 11 double-elimination bracket matches into `playoff_matches` for the "Recreational Winter 1 2026" bracket. No BYEs, no schema changes.

### Verified Data

**Bracket:** `29a823d8-47b3-489c-a9f1-ebc6586d9baf` (Recreational Winter 1 2026)
**Existing rows for this bracket:** 0 (clean insert)

**Team ID Map (all verified from DB):**

| Team | ID |
|---|---|
| On a Mission | 00def929-de16-4f59-933f-ae0247b04358 |
| Corn Kitties | ea3b15e7-8bc7-467c-85fc-7f91e89742a1 |
| Here for Fireball | c577e0f9-6700-4220-a902-b368ca915bbd |
| Sour Patch Kids | de3cb5fe-7c5f-4211-8876-a52140df49b7 |
| Double Trouble | 31e0e752-e0fc-4bd1-892f-3b7123ad72b7 |
| The Tomato Saucers | accd6e20-f761-4769-8cdc-6c9495cc231c |
| The Cornholy Trinity | 34b1dacf-0c30-4a4c-8228-432701868f34 |
| Sack to the Future | 92e9f091-82f2-446d-8990-576c89a120e1 |

Note: DB casing differs slightly from prompt (e.g., "On a Mission" not "On A Mission"). Using exact DB values.

### Matches to Insert (11 total)

**Winners Bracket (7 matches)**

| Round | Pos | Team 1 | Team 2 | Score | Status |
|---|---|---|---|---|---|
| 1 | 1 | On a Mission | Corn Kitties | 2-0 | completed |
| 1 | 2 | Here for Fireball | Sour Patch Kids | 2-0 | completed |
| 1 | 3 | Double Trouble | The Tomato Saucers | 2-0 | completed |
| 1 | 4 | The Cornholy Trinity | Sack to the Future | 2-0 | completed |
| 2 | 1 | On a Mission | Here for Fireball | 0-2 | completed |
| 2 | 2 | Double Trouble | The Cornholy Trinity | 0-2 | completed |
| 3 | 1 | Here for Fireball | The Cornholy Trinity | -- | pending |

**Losers Bracket (4 matches)**

| Round | Pos | Team 1 | Team 2 | Score | Status |
|---|---|---|---|---|---|
| 1 | 1 | Corn Kitties | Sour Patch Kids | 2-1 | completed |
| 1 | 2 | The Tomato Saucers | Sack to the Future | 0-2 | completed |
| 2 | 1 | On a Mission | Corn Kitties | -- | pending |
| 2 | 2 | Double Trouble | Sack to the Future | -- | pending |

### Implementation

Same approach as previous bracket seeds:
1. Create a temporary edge function `seed-recreational-playoffs`
2. Deploy and invoke it to batch-insert all 11 rows with idempotency check (skip if rows already exist for this bracket)
3. Verify via SQL query
4. Delete the temporary edge function

### Technical Details

- `supabase.from('playoff_matches').insert([...])` with all 11 match objects
- Each row uses `crypto.randomUUID()` for `id`
- `best_of = 3`, `next_win_match_id` and `next_lose_match_id` = `null`, seeds = `null`
- Completed (8): scores + winner_id + loser_id + status="completed"
- Pending (3): scores null + winner/loser null + status="pending"
- Deduplication: checks existing row count by bracket_id before inserting

