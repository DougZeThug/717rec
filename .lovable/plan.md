## Test failure

Ran `npm test` — **1 failing test** out of 2317:

```
FAIL src/utils/__tests__/badgeConfig.test.ts > getBadgeConfig > returns cyan variant for intermediate_champion with High division metadata
AssertionError: expected 'Intermediate Champion' to be 'Intermediate High Champion'
```

### Root cause

`getBadgeConfig` (in `src/utils/badgeConfig.ts`) reads `metadata.division_name` (matching the typed `ChampionshipBadgeMetadata` interface in `src/types/badges.ts`, which has `division_name: string`). The test fixture passes the wrong key:

```ts
metadata: { division: 'Intermediate High' }   // ❌ should be division_name
```

So the lookup returns an empty string and the base config is returned instead of the cyan "Intermediate High Champion" variant.

This is a test-only bug; production code and the type contract are correct.

### Fix

Update `src/utils/__tests__/badgeConfig.test.ts` line 39: rename `division` → `division_name` so the fixture matches the `ChampionshipBadgeMetadata` shape. No `any` is introduced — the existing `TeamBadgeEvent` type accepts `Json` for `metadata`, so a plain object literal with the correct key compiles cleanly.

```ts
metadata: { division_name: 'Intermediate High' },
```

### Verify

Re-run just the affected file:

```
npx vitest run src/utils/__tests__/badgeConfig.test.ts
```

Expect all 8 tests to pass, with the full suite back to 2317/2317.