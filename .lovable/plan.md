# Softer division colors for playoff brackets

## Goal
Keep the red / amber / green division identity, but make the playoff page use muted, theme-friendly versions instead of the full-saturation neon tones.

## What changes visually
- Division headings ("Competitive Division") become a softer, desaturated tint of their color instead of pure bright red / yellow / green.
- The left accent bar on each division card becomes a low-opacity version of the tier color.
- The trophy icon and empty-state icon use the same softer tone.
- "Create Bracket" buttons stop using saturated tier fills; they use a subtle tinted background with tier-colored text and border.
- `BracketDetail` border colors get corrected too (they currently use blue for Intermediate and amber for Competitive, which does not match the league standard).

Standings, teams, stats and badges keep their current colors. Only the playoff surfaces change.

## Technical details
1. `src/styles/theme.css` — add soft tier tokens next to existing ones, for light and dark blocks:
   - `--competitive-soft`, `--intermediate-soft`, `--recreational-soft`
   - Same hue, lower saturation and tuned lightness so they read calm on the dark navy background (roughly `0 55% 62%`, `38 65% 60%`, `150 40% 55%` in dark; slightly darker in light mode for contrast).
2. `tailwind.config.ts` — register `competitive-soft`, `intermediate-soft`, `recreational-soft` colors so utilities are available.
3. `src/utils/colors/divisionColors.ts` — add a `getDivisionSoftClasses(division)` helper returning `{ text, border, iconBg, buttonClass }` built on the new tokens.
4. `src/components/playoffs/DivisionBracketsCard.tsx` — replace `getDivisionBorderColor`, `getDivisionTextColor`, `getDivisionButtonClass` with the shared soft helper.
5. `src/components/playoffs/BracketDetail.tsx` — replace hardcoded `border-green/blue/amber` with the soft tier tokens, mapped to the correct tier.
6. Check remaining playoff components (`FinalStandings`, `PlayoffPageLayout`, match cards) for hardcoded saturated tier colors and switch them to the soft helper.

## Verification
- `npm run typecheck`
- `npm run test:file -- src/pages/__tests__/Playoffs.test.tsx`
- Screenshot the playoffs page in dark mode to confirm the calmer look.
