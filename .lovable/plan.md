

## Seed Intermediate Winter 1 2026 Playoff Matches

### Summary
Insert 11 double-elimination bracket matches into `playoff_matches` for the "Intermediate Winter 1 2026" bracket. No BYEs, no schema changes.

### Verified Data

**Bracket:** `dbf640b8-2f5e-4a05-8ecb-71b49aee15b0` (Intermediate Winter 1 2026)
**Existing rows for this bracket:** 0 (clean insert)

**Team ID Map (all verified from DB):**

| Team | ID |
|---|---|
| Miracle @ Marion | 2ab2e684-8c28-45c3-801a-ea215433a8e4 |
| Toss D.Bag | abd71084-cf3f-431e-a57a-428cbe96b459 |
| Wrong Hole | 0c7261b9-db22-48d1-8487-ba9eeb90fbef |
| Smooth Sliders | 8aef742f-f7d7-4996-a2bb-96a430b5e005 |
| Buttery Nips | 01ec006b-6ee3-47b3-ac8d-f93cc11d3460 |
| Happy Valley Hole Hunters | a484a124-89f8-468d-9ebb-2709ad47c7f5 |
| Bumbleweed | 37bf909c-3bcf-45fc-860e-9f64b7b03cbe |
| The Undigestibles | c08fd547-4938-48dc-9b9d-dca99f7a1f09 |

### Matches to Insert (11 total)

**Winners Bracket (7 matches)**

| Round | Pos | Team 1 | Team 2 | Score | Status |
|---|---|---|---|---|---|
| 1 | 1 | Miracle @ Marion | Toss D.Bag | 2-0 | completed |
| 1 | 2 | Wrong Hole | Smooth Sliders | 2-0 | completed |
| 1 | 3 | Buttery Nips | Happy Valley Hole Hunters | 2-0 | completed |
| 1 | 4 | Bumbleweed | The Undigestibles | 2-0 | completed |
| 2 | 1 | Miracle @ Marion | Wrong Hole | 1-2 | completed |
| 2 | 2 | Buttery Nips | Bumbleweed | 1-2 | completed |
| 3 | 1 | Wrong Hole | Bumbleweed | -- | pending |

**Losers Bracket (4 matches)**

| Round | Pos | Team 1 | Team 2 | Score | Status |
|---|---|---|---|---|---|
| 1 | 1 | Toss D.Bag | Smooth Sliders | 0-2 | completed |
| 1 | 2 | Happy Valley Hole Hunters | The Undigestibles | 2-0 | completed |
| 2 | 1 | Miracle @ Marion | Smooth Sliders | -- | pending |
| 2 | 2 | Buttery Nips | Happy Valley Hole Hunters | -- | pending |

### Implementation

Same approach as the Competitive bracket seed:
1. Create a temporary edge function `seed-intermediate-playoffs`
2. Deploy and invoke it to batch-insert all 11 rows with idempotency check
3. Verify via SQL query
4. Delete the temporary edge function

### Technical Details

- `supabase.from('playoff_matches').insert([...])` with all 11 match objects
- Each row uses `crypto.randomUUID()` for `id`
- `best_of = 3`, `next_win_match_id` and `next_lose_match_id` = `null`, seeds = `null`
- Completed (8): scores + winner_id + loser_id + status="completed"
- Pending (3): scores null + winner/loser null + status="pending"
- Deduplication: checks existing rows by (bracket_id, match_type, round, position) before inserting

