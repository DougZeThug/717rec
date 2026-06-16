## Goal
Fix the `validateMatchScores` function so it correctly rejects impossible match scores where the winner has more wins than mathematically possible in a best-of format.

## Problem
`validateMatchScores` currently accepts scores like 3-0 in a best-of-3 because it only checks `team1Wins >= minWinsRequired || team2Wins >= minWinsRequired`. In a best-of-3, the match ends as soon as a team reaches 2 wins, so 3-0 is impossible. The same bug affects best-of-5 scores like 4-0 or 4-1.

Other parts of the codebase (`matchValidationUtils.ts`, `ScoreParser.ts`) already enforce the correct rule: the winner must have exactly the minimum wins needed, and the loser must have fewer.

## Changes

### 1. Fix `scoreUtils.ts`
File: `src/components/playoffs/match-score-editor/MatchScoreEditor/utils/scoreUtils.ts`

Replace the permissive completion check on line 55 with a stricter check that mirrors the rule used in `matchValidationUtils.ts`:

- If team1 is the winner: `team1Wins === minWinsRequired && team2Wins < minWinsRequired`
- If team2 is the winner: `team2Wins === minWinsRequired && team1Wins < minWinsRequired`
- Reject everything else with an appropriate error message.

### 2. Add unit tests
File: `src/components/playoffs/match-score-editor/MatchScoreEditor/utils/__tests__/scoreUtils.test.ts`

Cover:
- Valid completed scores (e.g., 2-0, 2-1 in BO3; 3-0, 3-1, 3-2 in BO5)
- Invalid excess-winner scores (3-0 in BO3; 4-0, 4-1 in BO5)
- Both teams reaching minWinsRequired (still rejected)
- Tied games with non-zero scores (still rejected)
- Empty / zero scores (still allowed)
- Total games exceeding bestOf (still rejected)
- Incomplete scores where no team has reached minWinsRequired (still rejected)

## Verification
- Run the new unit test file: `npm run test:file -- src/components/playoffs/match-score-editor/MatchScoreEditor/utils/__tests__/scoreUtils.test.ts`
- Run TypeScript check: `npx tsc --noEmit`
- Optionally run the full test suite: `npm test`

## Notes
- No database changes required.
- No UI changes required.
- This is a pure validation logic fix and test addition.