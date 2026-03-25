

## Show Game Scores, Remove Checkmarks and Sub-Scores

### What changes
On the Schedule page MatchCard, for completed matches:
1. Display **game wins** (e.g. 2-0, 2-1) in the score pill instead of overall match score (team1Score/team2Score)
2. Remove the small `(game_wins)` text below each team name (lines 170-172, 216-218)
3. Remove the green `<Check>` icon next to winner names (lines 166, 212)
4. Remove the `Check` import from lucide-react (line 1)

### File: `src/components/schedule/MatchCard.tsx`

**Score pill** (lines 185-191): For completed matches, show `match.team1_game_wins` / `match.team2_game_wins` instead of `match.team1Score` / `match.team2Score`. For upcoming matches, keep showing `0 – 0`.

**Winner detection**: Update `team1IsWinner`/`team2IsWinner` (lines 57-66) to use `team1_game_wins > team2_game_wins` since we're now displaying game wins as the primary score.

**Remove** the `<Check>` icons on lines 166 and 212.

**Remove** the `(game_wins)` spans on lines 170-172 and 216-218.

**Remove** `Check` from the lucide-react import.

