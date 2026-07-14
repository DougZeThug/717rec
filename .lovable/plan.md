Add short JSDoc comments to each of the 8 public delegating methods on `BracketNormalizationService` to silence DeepSource JS-D1001 findings.

## File
`src/services/brackets/manager/services/BracketNormalizationService.ts`

## Methods to document
Each gets a one-line `/** ... */` describing the delegated behavior:

- `calculateLBRounds` — returns the number of losers-bracket rounds for a given bracket size.
- `findLBFinalMatch` — returns the LB final match for a stage (or null).
- `normalizeGrandFinalPopulation` — ensures the grand final is populated from WB/LB winners.
- `repairGrandFinalWithRetries` — retries grand-final normalization with configurable attempts/delay.
- `isWbFinalRound` — checks whether a round is the WB final for a stage.
- `isLbFinalRound` — checks whether a round is the LB final for a stage.
- `normalizeLosersR1` — normalizes losers-bracket round 1 seeding/population.
- `propagateCompletedMatches` — repairs missing winner advancement without rewriting completed source results.

## Non-goals
No behavior changes; no signature changes; no changes to the underlying delegated services.
