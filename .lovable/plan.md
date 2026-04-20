

## Plan: Fix `mockResolvedValue()` TypeScript errors and verify realtime mock claim

### What's happening

All 10 build errors share the same root cause: `.mockResolvedValue()` is called with **zero arguments**, but TypeScript requires exactly 1. These are void-returning mocks where the resolved value doesn't matter — the fix is to pass `undefined` explicitly.

### The "comprehensive Supabase realtime mocking" claim

**Not needed.** The only realtime subscription test (`useBracketsManagerRealtime.test.ts`) already has a complete, self-contained inline mock of `supabase.channel()`, `supabase.removeChannel()`, and the `.on()` / `.subscribe()` chain. No additional work is required.

### Changes

Replace every `.mockResolvedValue()` with `.mockResolvedValue(undefined)` in these 4 files:

| File | Occurrences |
|---|---|
| `src/hooks/__tests__/useScoreSubmissions.test.ts` | 2 (lines 77, 93) |
| `src/hooks/__tests__/useUncompletedMatches.test.ts` | 1 (line 11) |
| `src/hooks/playoffs/__tests__/usePlayoffActions.test.ts` | 4 (lines 55, 70, 121, 139, 140) |
| `src/hooks/playoffs/__tests__/usePlayoffEditMatch.test.ts` | 2 (lines 208, 209) |

### Files touched

- `src/hooks/__tests__/useScoreSubmissions.test.ts`
- `src/hooks/__tests__/useUncompletedMatches.test.ts`
- `src/hooks/playoffs/__tests__/usePlayoffActions.test.ts`
- `src/hooks/playoffs/__tests__/usePlayoffEditMatch.test.ts`

### Verification

Run `npm run typecheck` — all 10 errors should be resolved. No behavior change since `undefined` is the implicit resolved value already.

