

## Fix: Build Error + Badge Spam on Message Board

Three issues to resolve:

### 1. Build Error in setupTests.ts
The `@types/node` 25.2.0 update added a `scrollMargin` property to the `IntersectionObserver` interface. The mock is missing it.

**Fix**: Add `scrollMargin: string = '0px';` to the mock class (after line 35).

### 2. Remove Badge Failure Spam from Message Board
The `FailedBadgeOperationsService.notifyAdminOfFailure` method posts badge errors into the public `messages` table. These show up as ugly `[object Object]` errors on the message board. Badge failures are already tracked in localStorage and surfaced in the admin panel -- the message board notification is redundant and disruptive.

**Fix in `src/services/FailedBadgeOperationsService.ts`**:
- Remove the `notifyAdminOfFailure` method entirely
- Remove the call to it in `queueFailedOperation` (around line 87)
- Remove the `supabase` import (no longer needed)
- Remove the `badgeLog` import if no longer used

### 3. Clean Up Existing Spam Messages
Delete the existing `admin_notification` messages from the database.

**SQL**: `DELETE FROM messages WHERE category = 'admin_notification';`

### 4. Defensive Filter on Message Board Query
As a safety net, update `src/hooks/message-board/useMessageApi.ts` to exclude `admin_notification` messages by default (when no category filter is selected). Add after the existing category filter block:

```typescript
if (!category) {
  query = query.neq('category', 'admin_notification');
}
```

---

| File | Change |
|------|--------|
| `src/setupTests.ts` | Add `scrollMargin` property to mock |
| `src/services/FailedBadgeOperationsService.ts` | Remove `notifyAdminOfFailure` and related imports |
| `src/hooks/message-board/useMessageApi.ts` | Exclude `admin_notification` from default queries |
| Database | Delete existing spam messages |

