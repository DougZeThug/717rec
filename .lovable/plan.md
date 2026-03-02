

## Update Competitive Winter 1 2026 Playoff Matches

The read-query tool lacks write permissions on `playoff_matches` (RLS restricts writes to admins). I'll use a **database migration** to execute all 7 match operations in a single transaction.

### Data Resolved

| Team | ID |
|---|---|
| Jager Bombers | `b214167b-7f7e-4470-a811-bf2a093c9620` |
| Offdogs | `77110b92-d2d8-495b-afed-cac65deb6253` |
| Cuzzo's Clinic | `ad4ec289-fd85-4322-8ebb-68647607de23` |
| Bag Babies | `626be920-071d-4aea-a1f5-1819893215ca` |
| Pepperoni Cheesers | `c9d644a4-4e5a-43a0-9805-9d93299cda35` |
| Seize the Maize | `8c5adea2-09b7-4298-83dc-295dae74fdb8` |

**Bracket ID:** `428f974f-7295-410d-a3d0-d1f11280c17d`

### Operations (single migration)

**3 UPDATEs** on existing rows:
1. Winners R4 P1 (`1b74e515`): Jager Bombers 1 – Offdogs 2 → winner Offdogs
2. Losers R4 P1 (`6ae7ec84`): Cuzzo's Clinic 2 – Bag Babies 0 → winner Cuzzo's
3. Losers R4 P2 (`b376b6cc`): Pepperoni Cheesers 0 – Seize the Maize 2 → winner Seize the Maize

**4 INSERTs** for new rounds:
4. Losers R5 P1 (Losers Semi): Cuzzo's Clinic 2 – Seize the Maize 0 → winner Cuzzo's
5. Losers R6 P1 (Losers Final): Jager Bombers 0 – Cuzzo's Clinic 2 → winner Cuzzo's
6. Winners R5 P1 (GF1): Offdogs 0 – Cuzzo's Clinic 2 → winner Cuzzo's
7. Winners R6 P2 (GF2): Offdogs 0 – Cuzzo's Clinic 2 → winner Cuzzo's

**Champion metadata:** The `brackets` table has `wb_champion_id` but no dedicated champion/runner-up columns. I'll set `wb_champion_id` to Cuzzo's Clinic and `state` to `'completed'`. No runner-up column exists in the schema, so that will be skipped.

### File Changes
None — this is purely a data migration via the Supabase migration tool.

