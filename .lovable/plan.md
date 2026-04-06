

## Fix: Standardize error handling in useTimeslotMutation.ts

### What's wrong

There are two problems:

1. **Inconsistent pattern**: The bye-week functions (`assignByeWeek`, `batchAssignByeWeeks`, `removeByeWeek`) toast the error AND re-throw it. The other functions (`addTimeslot`, `deleteTimeslot`, `batchAssignTimeslots`, `batchAssignDoubleHeaders`) toast the error but return `null`/`false` — swallowing the error.

2. **Double toast bug**: The caller (`TimeslotsTab.tsx`) wraps every call in `try/catch` and shows its own success/error toasts. When a non-bye function fails, it returns `null` instead of throwing, so the caller's `catch` never fires. The caller then proceeds past `await` and shows a **success toast on top of the error toast**. Two toasts appear — one error, one success — which is confusing.

### Fix

**File: `src/hooks/useTimeslotMutation.ts`**

Change the 4 non-bye catch blocks to match the bye-week pattern: toast the error, then re-throw so the caller's `catch` fires and skips the success toast.

| Function | Current | Change to |
|----------|---------|-----------|
| `addTimeslot` (line 49) | `return null` | `throw err` |
| `deleteTimeslot` (line 72) | `return false` | `throw err` |
| `batchAssignTimeslots` (line 111) | `return null` | `throw err` |
| `batchAssignDoubleHeaders` (line 169) | `return null` | `throw err` |

No changes to validation early-returns (returning `null` before the service call is fine — those are user input issues, not errors).

No changes to the bye-week functions — they already follow the correct pattern.

### What this fixes

- Eliminates the double-toast (error + false success) on failures
- Makes all 7 mutation functions behave consistently: toast + re-throw
- Callers that use `try/catch` (like `TimeslotsTab`) now correctly skip success logic on error

### Scope

One file, 4 lines changed. No behavioral change for success paths.

