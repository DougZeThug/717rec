

## Seed Competitive Winter 1 2026 Playoff Matches

### Summary
Insert 14 double-elimination bracket matches into the `playoff_matches` table for the "Competitive Winter 1 2026" bracket. No BYEs, no schema changes.

### Verified Data

**Bracket:** `428f974f-7295-410d-a3d0-d1f11280c17d` (Competitive Winter 1 2026)
**Existing rows for this bracket:** 0 (clean insert, no duplicates)

**Team ID Map (all verified):**

| Team | ID |
|---|---|
| Jager Bombers | b214167b-7f7e-4470-a811-bf2a093c9620 |
| Bag Babies | 626be920-071d-4aea-a1f5-1819893215ca |
| Birds of Prey | 831c8441-2b8b-4512-8f09-9701062a6648 |
| 3 Amigos | 9ee2b996-99f6-446c-be20-8255ca75d8c8 |
| Pepperoni Cheesers | c9d644a4-4e5a-43a0-9805-9d93299cda35 |
| Offdogs | 77110b92-d2d8-495b-afed-cac65deb6253 |
| Came from Dicks | af3bf12d-b671-4458-9d3c-5c2e29e362ac |
| Cuzzo's Clinic | ad4ec289-fd85-4322-8ebb-68647607de23 |
| Seize the Maize | 8c5adea2-09b7-4298-83dc-295dae74fdb8 |

### Matches to Insert (14 total)

**Winners Bracket (8 matches)**

| Round | Pos | Team 1 | Team 2 | Score | Status |
|---|---|---|---|---|---|
| 1 | 2 | Bag Babies | Birds of Prey | 2-0 | completed |
| 2 | 1 | Jager Bombers | Bag Babies | 2-0 | completed |
| 2 | 2 | 3 Amigos | Pepperoni Cheesers | 0-2 | completed |
| 2 | 3 | Offdogs | Came from Dicks | 2-0 | completed |
| 2 | 4 | Cuzzo's Clinic | Seize the Maize | 2-1 | completed |
| 3 | 1 | Jager Bombers | Pepperoni Cheesers | 2-0 | completed |
| 3 | 2 | Offdogs | Cuzzo's Clinic | 2-1 | completed |
| 4 | 1 | Jager Bombers | Offdogs | -- | pending |

**Losers Bracket (6 matches)**

| Round | Pos | Team 1 | Team 2 | Score | Status |
|---|---|---|---|---|---|
| 2 | 1 | 3 Amigos | Birds of Prey | 1-2 | completed |
| 3 | 1 | Birds of Prey | Bag Babies | 1-2 | completed |
| 3 | 2 | Seize the Maize | Came from Dicks | 2-0 | completed |
| 4 | 1 | Cuzzo's Clinic | Bag Babies | -- | pending |
| 4 | 2 | Pepperoni Cheesers | Seize the Maize | -- | pending |

### Implementation

Use the Supabase client's `.insert()` method from an edge function invocation or direct client call (since the read-query tool lacks write permissions). The insert will use `gen_random_uuid()` equivalent (crypto.randomUUID) for IDs, set `best_of = 3` for all, and populate winner/loser/scores only for completed matches.

All 14 rows will be inserted in a single batch `.insert([...])` call via the Supabase JS client. Since there are 0 existing rows for this bracket, no deduplication logic is needed.

### Technical Details

- Use `supabase.from('playoff_matches').insert([...])` with all 14 match objects
- Each object uses `crypto.randomUUID()` for `id`
- `next_win_match_id` and `next_lose_match_id` set to `null` for all
- `team1_seed` and `team2_seed` set to `null`
- Completed matches: scores + winner_id + loser_id + status="completed"
- Pending matches: scores null + winner/loser null + status="pending"

