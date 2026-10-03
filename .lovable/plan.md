# Fix: hiding a team changes its past opponents' power scores

## What is wrong (confirmed from the live data)

- This season, The Cornholy Trinity has played 2 games: a **win** against Tom & Tom and a **loss** against Zoo Pals.
- The power score looks up each opponent's division **at the time of the game**. It checks, in order: weekly snapshots, archives, brackets, the team's current division, and then the last division seen in a snapshot.
- Zoo Pals has **no weekly snapshot yet**, because the season just started. So the only source left was their **current** division.
- Their current division is now Hidden. The power score skips Hidden opponents on purpose, so **the loss to Zoo Pals is no longer counted**.
- Result: the score now counts only the win, so it went from about 60 to 81.7.

## The fix

1. **Remember team division changes.** Add a small history list. Each time an admin moves a team to a new division, it saves the old division and the date of the move.
2. **Use that history in the power score.** When the score looks up an opponent's division for a game, it uses the division the team was in **on the game date**, before it falls back to the current division. A later move to Hidden no longer changes past games.
3. **Repair Zoo Pals now.** Zoo Pals was moved before the history existed, so I add one starting entry for them by hand. **I need you to tell me which Intermediate division they were in** (see the question below).
4. **Check:** The Cornholy Trinity goes back to about 60. Other teams that played Zoo Pals go back to their old scores too.

## Question for you

Zoo Pals was in which division before you hid them?
- Intermediate Low (weight 0.60)
- Intermediate (weight 0.70)
- Intermediate High (weight 0.80)
- cuspers (weight 0.90)

## Technical details

- New table `team_division_history (team_id, division_id, valid_from)`, filled by an AFTER UPDATE OF division_id trigger on `teams` (it stores the OLD division with valid_until = now). Grants + RLS: public SELECT, writes by trigger only.
- In `v_power_score_team_matches_rated`, add a new step before `dcur`: the latest history row for the opponent where the change happened after the match date, joined through `v_division_rateable`. Label it `resolved_by = 'division_history'`.
- One-time backfill row for Zoo Pals with the division you pick.
- Add a SQL test: hiding an opponent after a match does not change that match's `rates` / `opp_weight`.
