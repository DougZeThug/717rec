

## Plan: Fix Realtime UPDATE Inserting Messages Out of Order

### The problem

In `useMessageBoard.ts`, when a realtime UPDATE arrives for a message not in the current list, it's appended at the end (`[...curr, updatedMessage]`), breaking the `created_at` descending sort order.

### The fix

**1 file** — `src/hooks/message-board/useMessageBoard.ts`

In `handleMessageUpdated`, replace the append logic with a sorted insertion. When the updated message isn't in the list and matches filters, insert it at the correct position based on `created_at` descending:

```typescript
// Not in list — insert at correct position to maintain created_at desc order
if (matchesFilter) {
  const insertIndex = curr.findIndex(
    (msg) => msg.created_at < updatedMessage.created_at
  );
  if (insertIndex === -1) {
    return [...curr, updatedMessage]; // Oldest — append at end
  }
  return [...curr.slice(0, insertIndex), updatedMessage, ...curr.slice(insertIndex)];
}
return curr;
```

This mirrors how the insert handler prepends newest messages and keeps the list consistent with the server's `order('created_at', { ascending: false })`.

### What changes

- **1 file** — `src/hooks/message-board/useMessageBoard.ts`: replace `[...curr, updatedMessage]` with sorted insertion (~4 lines)
- **0 migrations, 0 other files**

