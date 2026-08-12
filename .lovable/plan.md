# Fix the career score division quirk

## The problem, confirmed

The base career score **is** division-aware, but only through SOS inside each season score. The bonuses added on top are division-aware in a *different, hardcoded* way. The two do not line up, so bonuses can flip the order.

How it works today (`src/utils/career/calculateCareerPowerScore.ts`):

1. Base = match-count-weighted average of every season Power Score (each season score = 40 win / 45 SOS / 15 game win).
2. Bonuses on top, capped at +15 total:
   - Championship: `7 x divisionWeight`
   - Runner-up: `4 x divisionWeight`
   - Playoff record over .500: `(winRate - 0.5) x 4 x currentDivisionWeight`
   - Competitive playoff wins: `+0.5` each

Two real defects found in that bonus code:

**1. The bonus weights are hardcoded and do not match the live divisions table.**

| Division | Hardcoded in code | Live `divisions.division_weight` |
|---|---|---|
| Competitive | 1.00 | 1.00 |
| Competitive Low | falls through to 1.00 | 0.95 |
| cuspers | 0.70 | 0.90 |
| Intermediate High | 0.70 | 0.80 |
| Intermediate | 0.45 | 0.70 |
| Intermediate Low | 0.45 | 0.60 |
| Recreational High | 0.25 | 0.60 |
| Recreational | 0.25 | 0.35 |

The code matches on the division **name string**, including synthetic labels like "Intermediate 1" / "Intermediate 2" that live in `team_season_stats.division_name` but match no row in `divisions`. The project README explicitly forbids copying weight values into code.

**2. The playoff-record bonus uses the team's CURRENT division weight**, not the division the playoff actually happened in. A team that changed divisions gets old results paid at today's rate.

**The quirk you flagged is real.** From live data:

| Team | Avg SOS | Base career | Titles | Bonus effect |
|---|---|---|---|---|
| Buttery Nips | 0.676 | 64.5 | 3 (Intermediate) | +~9.5 |
| Hole Burners | 0.879 | 67.0 | 0 (Competitive) | +~0 |

Buttery starts 2.5 points behind and finishes ahead, purely on bonuses earned in a much softer field.

## The fix

**Step 1 - Stop hardcoding the weights.**
Resolve every bonus weight from the live `divisions` table, using the division the team was actually in that season. Delete `getChampionshipWeight`.

**Step 2 - Rate playoff results by the division they happened in.**
Replace the single `teamDivisionWeight` input with per-season division weights, so an old Recreational playoff run is not paid at Competitive rates.

**Step 3 - Square the bonus weight.**
Scale championship and runner-up bonuses by `weight^2` instead of `weight`. This is the anti-quirk lever.

| Division | Title bonus now | Title bonus after |
|---|---|---|
| Competitive (1.00) | +7.0 | +7.0 |
| Intermediate (0.70 live) | +4.9 | +3.4 |
| Recreational (0.35) | +2.5 | +0.9 |

Titles still matter. A title in a soft field stops being worth nearly as much as one in Competitive, so a weak-division dynasty no longer out-earns a mid-pack Competitive team.

**Step 4 - Show the split in the UI.**
On career rankings and team pages, show `base + bonus` instead of one opaque number, so a result like Buttery vs Pepperoni explains itself.

## Technical notes

- Files: `src/utils/career/calculateCareerPowerScore.ts` (formula), `src/hooks/career/computeAllTeamsTotals.ts` and `src/hooks/career/useTeamTotalsComputed.ts` (both callers pass the new per-season weights), `src/services/career/CareerQueryService.ts` (fetch live division weights).
- No database migration. Career score is computed client-side; stored season Power Scores are untouched.
- Reuse the existing division-weight cache instead of adding a query per team.
- Update `src/utils/career/__tests__/calculateCareerPowerScore.test.ts` and `src/utils/powerScore/README.md` in the same change.

## Scope check

This reorders career rankings for teams with titles. It does **not** touch the 40/45/15 season formula, standings, or any stored data.