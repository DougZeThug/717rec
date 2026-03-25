

## Shrink Match Cards + Fix Prediction Bar + Clean Up Comments

### Changes

**1. `src/components/schedule/MatchCard.tsx`** — Shrink logos and tighten spacing
- Change both `TeamLogo` from `size="lg"` to `size="md"` (lines 159, 205)
- Reduce score text from `text-3xl` to `text-2xl` in `getScoreStyle` (line 83)
- Reduce score pill padding from `px-5 py-2` to `px-4 py-1.5` (line 180)
- Reduce card inner padding from `px-4 py-3` to `px-3 py-2` (line 146)
- Reduce logo-to-score gap from `gap-3` to `gap-2` (line 148)
- Reduce section margins (`mt-2` → `mt-1.5`) on H2H, countdown, prediction
- Reduce status badge top padding from `pt-2` to `pt-1.5`

**2. `src/components/schedule/MatchPrediction.tsx`** — Fix prediction bar fill
- The bar already has two colored divs filling team1Pct% and team2Pct% — this should