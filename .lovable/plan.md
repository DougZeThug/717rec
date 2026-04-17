

## Plan: Fix Realtime "CHANNEL_ERROR" + Clean Up Dead Realtime Hooks

### What the trajectory log showed

1. **Repeated bracket queries** — the brackets-manager library performs many small sequential SELECTs on `stage`/`group`/`round`/`match` (e.g., the same `group_id=298` and `stage_id=105` are fetched 4-5 times during one bracket render). This is how `brackets-manager` works internally — not something we can fix without forking the library. Not a bug, just verbose.
2. **`Realtime subscription FAILED`** at the end of the log — emitted by `useBracketsManagerRealtime` when its channel hits `CHANNEL_ERROR`.
3. Two **dead realtime hooks** still in the codebase that subscribe to tables NOT in the realtime publication (so they always silently fail):
   - `usePlayoffRealtime.ts` — subscribes to `playoff_matches` (not in publication, hook isn't imported anywhere)
   - `useBracketCompletion.ts` — subscribes to `brackets` (not in publication)

### Root cause of the CHANNEL_ERROR

I verified:
- `match` table IS in `supabase_realtime` publication ✓
- RLS allows public SELECT on `match` ✓
- Replica identity is FULL ✓

So the DB side is correct. The most likely cause is the **channel cleanup race** in `useBracketsManagerRealtime` (lines 85-89): when the effect re-runs (StrictMode in dev, or `stageId` arriving after `bracketId`), it loops through `supabase.getChannels()` and removes any channel whose topic includes `bracket-matches-${bracketId}`. If a previous channel is still in `joining` state, removing it mid-handshake causes the new channel to receive `CHANNEL_ERROR` from the server.

### The fix

**1. `src/hooks/brackets/useBracketsManagerRealtime.ts`** — Remove the speculative cleanup loop. The hook's own `return () => removeChannel(channel)` already handles cleanup correctly. Add a small retry on `CHANNEL_ERROR` (one retry after 2s) so a transient handshake error self-heals instead of leaving the indicator red.

**2. `src/hooks/usePlayoffRealtime.ts`** — Delete the file. It's unused and subscribes to a table not in the publication.

**3. `src/hooks/useBracketCompletion.ts`** — Either:
   - Add `brackets` to the realtime publication via migration so the existing logic works, OR
   - Replace the realtime listen with a one-shot check inside the existing `useBracketsManagerRealtime` payload handler (when a match update completes the final, call `calculateFinalStandings`).

   Recommendation: **add `brackets` to the publication** (1-line migration). This is the smallest, safest change and keeps the hook's intent.

### What changes

- **2 source files edited** (`useBracketsManagerRealtime.ts`, `useBracketCompletion.ts` — no logic change, just relies on publication being added)
- **1 source file deleted** (`usePlayoffRealtime.ts`)
- **1 migration** — `ALTER PUBLICATION supabase_realtime ADD TABLE public.brackets;` and set `REPLICA IDENTITY FULL`

### What I'm NOT changing

- The brackets-manager query volume — it's library-internal and would need a caching wrapper around `SupabaseSqlStorage.select()` to fix. Worth a separate dedicated effort if perceived as slow; otherwise leave alone (calls are ~70ms each and run once on bracket open).

