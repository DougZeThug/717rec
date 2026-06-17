## Status: Not finalized

The Recreational Spring 2026 bracket (`3457c81c-516d-47c8-859d-cb2bdcc3ddf8`) already has all 15 matches entered with scores and winners, but it's missing three things:

1. Most match rows are still `status='pending'` instead of `completed`
2. The bracket's `wb_champion_id` is `NULL`
3. `playoff_team_records` has 0 final standings rows

## Match results I'll verify

All 15 matches are already in the DB with these scores (I'll just flip them to `completed`). 6-team double elim:

**Winners Bracket**
- R1: Here for Fireball — bye; Double Trouble def. Corn Kitties 2–1; Sour Patch Kids — bye; Cornholy Trinity def. Smacked 2–1
- R2: Here for Fireball def. Double Trouble 2–1; Cornholy Trinity def. Sour Patch Kids 2–1
- SF: Cornholy Trinity def. Here for Fireball 2–0

**Losers Bracket**
- R1: Corn Kitties — bye; Smacked — bye
- R2: Sour Patch Kids def. Corn Kitties 2–0; Double Trouble def. Smacked 2–1
- R3: Sour Patch Kids def. Double Trouble 2–1
- R4: Here for Fireball def. Sour Patch Kids 2–0

**Grand Finals**
- GF: Here for Fireball def. Cornholy Trinity 2–0
- GF Reset: Cornholy Trinity def. Here for Fireball 2–0

## Final standings I'll write to `playoff_team_records`

| Place | Team | W–L | Games |
|---|---|---|---|
| 1 | The Cornholy Trinity | 4–1 | 8–4 |
| 2 | Here for Fireball | 3–2 | 6–4 |
| 3 | Sour Patch Kids | 2–2 | 5–5 |
| 4 | Double Trouble | 2–2 | 6–5 |
| 5 | Corn Kitties | 0–2 | 1–4 |
| 6 | Smacked | 0–2 | 2–4 |

## SQL actions
1. `UPDATE playoff_matches SET status='completed' WHERE bracket_id=… AND winner_id IS NOT NULL`
2. `UPDATE brackets SET wb_champion_id='<Cornholy Trinity id>', state='completed' WHERE id=…`
3. `INSERT INTO playoff_team_records` (6 rows above)

Reply **"go"** and I'll execute. Flag any score/placement to change first (e.g. if 5th/6th between Corn Kitties and Smacked should swap).
