## Fix DeepSource JS-R1004 (useless template literals)

Replace template literals with regular string literals where there is no interpolation, no multi-line content, and no quote-escaping benefit. Strings containing apostrophes will use double quotes.

### Files & changes

**User-reported (still outstanding):**
1. `src/hooks/useMatchCreation.ts` (L68) — `` `Match has been successfully scheduled.` `` → `'Match has been successfully scheduled.'`
2. `src/hooks/matches/utils/teamDataUtils.ts` (L7) — `` `Fetching teams for ids:` `` → `'Fetching teams for ids:'`
3. `src/utils/timeUtils.ts` (L130) — `` `Conversion results:` `` → `'Conversion results:'`

Note: the two `BracketUpdateService.ts` lines the user pasted are already plain strings in the current source — no change needed.

**Other JS-R1004 violations found via repo sweep:**
4. `src/hooks/matches/utils/matchValidationUtils.ts` — L33, L52, L65 (use double quotes for "can't"), L76, L82, L91, L104, L124
5. `src/hooks/matches/utils/matchUpdateUtils.ts` — L71
6. `src/hooks/scheduling/usePairingGenerator.ts` — L119 (concat-only template)
7. `src/hooks/scheduling/utils/dualBlockScheduler.ts` — L97
8. `src/components/admin/mass-score-entry/utils/matchValidation.ts` — L12, L27, L47, L57
9. `src/components/admin/mass-score-entry/services/matchQueryService.ts` — L7
10. `src/components/admin/mass-score-entry/hooks/useScoreSubmission.ts` — L98
11. `src/components/admin/mass-score-entry/hooks/useMatchSubmission.ts` — L86
12. `src/components/admin/mass-score-entry/hooks/submission/useMatchValidation.ts` — L21
13. `src/components/stats/WinLossBarChart.tsx` — L50 (`` `rotate(-24)` `` → `'rotate(-24)'`)
14. `src/components/playoffs/animation/BracketAnimationUtils.tsx` — L10, L20, L31 (animation shorthand strings)

### Verification
- `npm run lint` (formatting clean)
- `npm run typecheck` (no type regressions)

### Scope guardrails
- No behavior changes — pure string-literal swap.
- Skip backticks inside comments/JSDoc and Markdown code fences.
- Skip template strings that contain `${...}`, newlines, or both quote types.
