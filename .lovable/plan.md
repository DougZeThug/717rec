## Bug verified

`src/services/timeslots/DoubleHeaderService.ts` (both `assignDoubleHeader` and `batchAssignDoubleHeaders`) expands `slot1` and `slot2` into two back-to-back pairs without checking that the resulting 4 timeslots are distinct. Adjacent picks like `7:00 PM` (→ `7:00/7:30`) and `7:30 PM` (→ `7:30/8:00`) produce two rows for the same team at `7:30 PM` on the same date. There is no DB unique constraint on `(team_id, match_date, timeslot)`, so the corrupt rows persist.

## Fix

Single file: `src/services/timeslots/DoubleHeaderService.ts`. Add an overlap check immediately after both pair configs are resolved, in both methods. Throw the same `ValidationError` type already imported.

```ts
const allSlots = [
  pair1Config.primary,
  pair1Config.secondary,
  pair2Config.primary,
  pair2Config.secondary,
];
if (new Set(allSlots).size < 4) {
  throw new ValidationError(
    `Double header pairs cannot overlap. ${slot1} and ${slot2} would assign the team to the same timeslot twice.`
  );
}
```

Apply the same check in `batchAssignDoubleHeaders` (it shares the same expansion logic before the per-team loop, so one check covers all teams).

Optionally extract the pair resolution + overlap validation into a private static helper `resolvePairs(slot1, slot2)` returning `{ pair1Config, pair2Config }` to avoid drift between the two methods. Low-risk small refactor; happy to keep inline if simpler.

## Out of scope

- No DB schema change. A unique index on `(team_id, match_date, timeslot)` would be a stronger fix but risks colliding with other legitimate flows (back-to-back already inserts a team into two slots — fine — but other scheduling code would need auditing). Leave for a follow-up.
- UI prevention in the timeslot picker is a separate (additive) improvement; the service-layer guard is the correctness backstop.

## Verification

- Add unit test: `assignDoubleHeader(date, team, '7:00 PM', '7:30 PM')` rejects with `ValidationError`.
- Add unit test: `batchAssignDoubleHeaders(date, [team1, team2], '7:00 PM', '7:30 PM')` rejects before any insert.
- Existing happy-path tests (non-overlapping pairs) still pass.
- `npm run test:file -- src/services/timeslots/__tests__/DoubleHeaderService.test.ts`

Risk: Low. Pure validation guard added before any DB write. Rollback: trivial.