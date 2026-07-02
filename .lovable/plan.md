# Realtime Reliability Hardening

## Problem
- `useBracketCompletion` only calls `channel.unsubscribe()` in cleanup — it never calls `supabase.removeChannel(channel)`. That leaves the channel registered on the client, leaks memory across bracket switches, and (per our own Realtime guidance) can drive reconnection storms.
- None of our 8 realtime hooks handle `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED` status callbacks. When the socket drops (mobile backgrounding, wifi flap, Supabase blip), the UI silently stops updating and never retries.

## Scope
Only touch realtime hooks — no service/DB/UI changes.

Files:
1. `src/hooks/useBracketCompletion.ts`
2. `src/hooks/notifications/useNotificationsRealtime.ts`
3. `src/hooks/message-board/useMessageRealtime.ts`
4. `src/hooks/message-board/useMessageReactions.ts`
5. `src/hooks/matches/useMatchComments.ts`
6. `src/hooks/matches/useMatchReactions.ts`
7. `src/hooks/contact/useContactRequests.ts`
8. `src/hooks/brackets/useBracketsManagerRealtime.ts`

## Changes

### 1. Fix `useBracketCompletion` cleanup
Replace:
```ts
return () => { channel.unsubscribe(); };
```
with:
```ts
return () => { supabase.removeChannel(channel); };
```
(matches the pattern already used by `useNotificationsRealtime`; `removeChannel` unsubscribes + deregisters.)

### 2. Add a shared realtime helper
New file `src/hooks/realtime/subscribeWithRetry.ts` exporting `subscribeWithRetry(channel, { label, onReconnect? })`:
- Attaches `.subscribe((status, err) => …)` handler.
- On `SUBSCRIBED`: reset backoff, call optional `onReconnect()` (used by data hooks to refetch/invalidate so we recover missed events).
- On `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED`: `errorLog` with label, then schedule `supabase.removeChannel` + re-subscribe with exponential backoff (1s → 2s → 4s → 8s → cap 30s, jittered). Cancelable via returned `dispose()` used from the effect cleanup.
- Returns `{ dispose }` so hooks call it in their cleanup instead of `removeChannel` directly.

### 3. Wire each realtime hook through the helper
For each of the 7 remaining hooks:
- Keep existing `.on(...)` handlers.
- Replace `.subscribe()` + manual cleanup with `subscribeWithRetry(channel, { label: '<hook-name>', onReconnect })`.
- `onReconnect` behavior:
  - `useNotificationsRealtime`, `useContactRequests`, `useBracketsManagerRealtime`: invalidate the relevant React Query keys (already imported in those files).
  - `useMatchComments` / `useMatchReactions` / `useMessageReactions` / `useMessageRealtime`: re-run their initial fetch so state resyncs after a drop.
- Cleanup returns `dispose()`.

### 4. No new dependencies, no behavior change on happy path
The helper is a thin wrapper; when the socket stays up, hooks behave exactly as today.

## Verification
- `npm run typecheck`
- `npm run test:file -- src/hooks/matches/__tests__` (existing tests must still pass; no new tests required unless you want them).
- Manual: toggle network offline/online in devtools on Playoffs page and confirm bracket updates resume without reload.

## Out of scope
- Changing which tables are on `supabase_realtime`.
- Any RLS / service changes.
- Presence/broadcast channels (none in repo).
