## Assessment

All three issues are valid.

**V1 — `useMessageBoard.ts:131` (P2, error masks cached feed)**
`error` is derived unconditionally from `messagesQuery.error`. A "load more" failure sets `messagesQuery.error` while `messagesQuery.data` still holds prior pages, but the consumer shows a full error card and hides the cached feed. A retry toast is also fired at line 156-162, so users see both.

**V2 — `useMessageBoard.ts:234` (P2, unbounded reconciliation buffer)**
`realtimeMessagesRef` accumulates every realtime insert/update for the lifetime of the current `queryKey`. On a busy board with unchanged filters it grows without limit, defeats `MAX_MESSAGES_IN_STATE`, and every refetch iterates the whole map inside `queryFn` (lines 109-116). The ref is only needed to bridge in-flight refetches so realtime deltas aren't lost between the network round-trip; once a refetch completes, entries that landed in the server page (or are older than the oldest visible message) can be dropped.

**V3 — `useMessageReactions.ts:117` (P1, deleted reaction resurrects on reconnect)**
`realtimeInsertsRef` is populated on every INSERT event but is never cleared except when `messageId` changes (line 55-59). After a socket drop during which a reaction was deleted server-side, `onReconnect` calls `invalidate()` → `queryFn` re-fetches, but then merges every stale entry from `realtimeInsertsRef` back in (lines 66-68), re-inserting the deleted reaction. The buffer exists only to protect an in-flight fetch from being overwritten by a slower snapshot; it must be cleared at resync time so the fresh server snapshot wins.

## Fix plan

### 1. `src/hooks/message-board/useMessageBoard.ts`

- **Line 131**: change to
  ```
  const error =
    messagesQuery.error && (messagesQuery.data?.pages.flat().length ?? 0) === 0
      ? 'Failed to load messages'
      : null;
  ```
  Initial-load failures still surface the error UI; pagination/refetch failures keep cached pages visible and rely on the existing toast at lines 157-161.

- **Lines 78, 95-126, 228-295**: bound `realtimeMessagesRef` and prune reconciled entries.
  - Add a constant `REALTIME_BUFFER_MAX = MAX_MESSAGES_IN_STATE` (100).
  - In the `queryFn`, after building `byId`, iterate `realtimeMessagesRef.current` and delete any entry whose `id` is present in the freshly fetched `page` (server-of-record has caught up) or whose `created_at` is older than the last message returned (it's outside the paginated window we care about).
  - In `handleMessageInserted` / `handleMessageUpdated`, after setting the entry, if `realtimeMessagesRef.current.size > REALTIME_BUFFER_MAX`, drop the oldest entries (sort by `created_at` ascending and slice) so the map is bounded even without a refetch.
  - `realtimeDeletesRef` gets the same size cap, since delete tombstones can also grow unbounded on a long-lived board.

### 2. `src/hooks/message-board/useMessageReactions.ts`

- **Lines 61-76**: at the start of `queryFn`, clear both `realtimeInsertsRef.current` and `realtimeDeletesRef.current` **before** the `await MessageReactionsService.fetchReactions(...)`. Any INSERT/DELETE events that arrive during the in-flight fetch will re-populate the refs and still be reconciled into the returned map afterward. Once the snapshot returns, stale buffered inserts (including ones that were server-deleted while disconnected) are gone, so the fresh snapshot is authoritative.

  Sketch:
  ```ts
  queryFn: async () => {
    const insertsSnapshot = new Map(realtimeInsertsRef.current);
    const deletesSnapshot = new Set(realtimeDeletesRef.current);
    realtimeInsertsRef.current.clear();
    realtimeDeletesRef.current.clear();
    const fetched = await MessageReactionsService.fetchReactions(messageId);
    const byId = new Map(fetched.map((r) => [r.id, r]));
    // merge inserts that arrived DURING the fetch (from realtimeInsertsRef, now repopulated)
    realtimeInsertsRef.current.forEach((r, id) => byId.set(id, r));
    // apply deletes that arrived DURING the fetch
    realtimeDeletesRef.current.forEach((id) => byId.delete(id));
    return Array.from(byId.values());
  }
  ```
  Snapshots aren't reused — they exist only to make the intent explicit and to allow future logging. Alternative simpler form: just clear at start; realtime handlers running concurrently already write into the same refs, and the post-fetch merge picks them up.

## Non-goals

- No changes to `useMatchReactions.ts` (not called out in the report).
- No API/service changes.
- No UI/component changes; consumers of `error` already expect `null` when data is fine.

## Verification

- `npm run test:file -- src/hooks/message-board` (existing tests plus a targeted addition):
  - `useMessageBoard` returns `error === null` when a `fetchNextPage` rejects but prior pages exist; returns the error string only when `data` is empty.
  - `realtimeMessagesRef` size stays ≤ 100 after 150 simulated inserts.
  - `useMessageReactions` — after a fetch resolves, a reaction that was in `realtimeInsertsRef` but absent from the server snapshot no longer appears in the cache.
- Manual: post/edit/delete on the board, drop network briefly, restore, confirm removed reactions/messages stay removed.
