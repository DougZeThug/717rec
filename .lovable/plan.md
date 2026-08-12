# Fix career power score: stop soft-division titles from saturating the bonus cap

## What I found (verified against live data)

Buttery Nips vs Pepperoni Cheesers, using their real season rows:

| | Buttery Nips | Pepperoni Cheesers |
|---|---|---|
| Weighted base score (SOS already inside) | ~64.5 | ~69.5 |
| Playoff/title bonus | **15.0 (hits the cap)** | ~6-7 |
| Final | **~79.5** | ~76 |

**The base score already has Pepperoni ahead by 5 points.** The bonus is what flips it.

Why the bonus flips it:
- Buttery has 3 titles + 1 runner-up, all in Intermediate (live weight 0.70).
- Squared bonus per title = 7 x 0.49 = 3.43. Three titles plus the runner-up total ~12.3, and the playoff win-rate bonus pushes past the **+15 cap**. Buttery gets the maximum bonus any team can get.
- Pepperoni has 1 title in Intermediate High (0.80) = 4.48, plus a small competitive-playoff bonus. Nowhere near the cap.

So the cap is the bug. It is a flat +15 for everyone, so stacking titles in a soft division buys the same maximum as dominating Competitive.

Note: my last change also raised the Intermediate title weight (old hardcoded 0.45 -> 0.70 squared = 0.49), which pushed Buttery over the cap. That is why it got worse.

## The fix

1. **Scale the cap by division strength.** Cap becomes `15 x (best division weight the team earned bonuses in)^2` instead of a flat 15.
   - Buttery: cap = 15 x 0.49 = **7.35**
   - Pepperoni: cap = 15 x 0.64 = 9.6, and Competitive runs raise it toward 15
2. **Diminishing returns on repeat titles.** 1st title full value, 2nd x0.6, 3rd x0.36, and so on. Three soft titles no longer equal three hard ones.
3. Runner-up and playoff-run bonuses keep the squared-weight scaling already in place.

## Expected result

- Buttery Nips: ~64.5 + ~7.3 = **~71.8**
- Pepperoni Cheesers: ~69.5 + ~6.5 = **~76**

Pepperoni moves ahead, which matches their much harder schedule. Competitive champions are unaffected: their weight is 1.0, so their cap stays 15.

## Technical detail

- Edit `src/utils/career/calculateCareerPowerScore.ts` only:
  - apply a decay factor per additional championship and runner-up
  - compute `cap = 15 * maxWeight^2`, where `maxWeight` is the highest live division weight across the team's title, runner-up, and playoff divisions (fallback: current division weight)
- No database change, no change to season power score, no UI change. Career score stays one opaque number.
- Update the unit tests in `src/utils/career/__tests__/` and the note in `src/utils/powerScore/README.md`.
- Verify by re-reading the career rankings for both teams after the change.