## Goal

Correct two Competitive Spring 2026 playoff match records so the recorded winner matches what actually happened on the court, while leaving the rest of the bracket progression alone (because the *losers* of these games were the ones who advanced due to scheduling).

## The two matches

1. **Play-in (WB R1, position 1)** — currently: Bumbleweed def. Pepperoni Cheesers 2–1
   → flip to: **Pepperoni Cheesers def. Bumbleweed 2–1**
   Match id: `0ae357c1-e560-4a38-9ce4-955cdcb81d70`

2. **WB Round 2, position 4** (their R1 after the play-in) — currently: Hole Violators def. Hole Burners 2–1
   → flip to: **Hole Burners def. Hole Violators 2–1**
   Match id: `53002d8f-ef7d-41a5-a3d0-2995074d92e0`

## What I'll change (data only — no code changes)

For each of the two matches, in `playoff_matches`:
- Swap `winner_id` ↔ `loser_id`
- Swap `team1_score` ↔ `team2_score` so the new winner has 2 and the new loser has 1
- Update the corresponding `playoff_games` rows (game-by-game scores) so the winning team's game-wins match the new 2–1 result

I will leave untouched:
- `team1_id` / `team2_id` slot assignments (so the bracket UI still shows who actually advanced)
- All downstream matches (LB R1, LB R2, LB R3, WB R3, LB R4, etc.) — Bumbleweed and Hole Violators stay where they progressed to
- `wb_champion_id`, season champion fields, all other brackets

### Forfeit/advance note

`playoff_matches` doesn't currently have a notes column, so I'll add a lightweight one:

- **Migration**: add nullable `admin_note TEXT` column to `public.playoff_matches` (no RLS / grant changes needed — existing policies cover it).
- **Data update**: set `admin_note` on those two matches to something like *"Recorded result reflects on-court outcome. Bumbleweed advanced in bracket because Pepperoni Cheesers could not play the following week."* (and the equivalent for Burners/Violators).

The column will simply sit in the DB for now — no UI surfacing in this change. If you later want it displayed on the playoff match editor / bracket popover, that's a separate small UI task.

## Order of operations

1. Migration: add `admin_note` column to `playoff_matches` (you'll approve it).
2. Data update (insert tool): flip winner/loser + scores on the 2 matches, update their `playoff_games` rows, set `admin_note` on both.
3. You can verify on the Playoffs page that Cheesers/Burners now show as the recorded winners of those two specific games, while Bumbleweed/Violators still appear in the downstream slots they advanced to.

## Out of scope

- No changes to team season stats / standings (playoff games don't affect regular-season W/L).
- No changes to any other bracket or season.
- No UI changes to display `admin_note` yet.
