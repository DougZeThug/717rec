## Bug verified

`usePairingOperations` persists `generatedPairings` to sessionStorage with no association to the date they were generated for. `useAutoScheduleState` separately persists `selectedDate`. Because `saveAutoScheduleState` merges partial updates, a date change leaves stale `generatedPairings` in storage. `handleApplySchedule` then writes those stale pairings to whatever `selectedDate` is current — silently scheduling matches on the wrong day.

## Fix (single file: `src/hooks/useAutoSchedule/usePairingOperations.ts`)

Track the generation date alongside the pairings and reject apply when it doesn't match the currently selected date. Persist the generation date so the staleness check survives reloads.

1. Extend `PersistedAutoScheduleState` in `storage.ts` with an optional `generationDate: string | null` field, default `null`, validated as `value.generationDate === null || isString(value.generationDate)`. Treat the field as optional in the type guard (also accept `undefined` to stay backward-compatible with existing sessionStorage payloads).
2. In `usePairingOperations`:
   - Add `const [generationDate, setGenerationDate] = useState<Date | null>(() => persistedState.current?.generationDate ? new Date(persistedState.current.generationDate) : null);`
   - In the persistence `useEffect`, also persist `generationDate: generationDate?.toISOString() ?? null`.
   - In `handleGenerateClick`, after `setGeneratedPairings(result.pairings)` call `setGenerationDate(selectedDate)`.
   - In `handleApplySchedule`, after the empty-pairings guard, compare `generationDate?.getTime()` to `selectedDate?.getTime()`. If they differ, show a destructive toast ("Schedule Stale — Pairings were generated for a different date. Please regenerate.") and return `null`.
3. Return `generationDate` from the hook (optional — useful for UI hints) — leave existing return shape additive.

## Verification

- `npm run test:file -- src/hooks/useAutoSchedule/__tests__/usePairingOperations.test.ts`
- Add a test mirroring the failing test in the report: persisted pairings + a different `selectedDate` → `handleApplySchedule` returns `null` and toast called with "Stale".
- Manual: generate pairings on date A, switch to date B, click Apply → see toast, no matches written.

Risk: Low. Additive optional field with backward-compatible type guard; no changes to other consumers of the persisted state.