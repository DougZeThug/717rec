

## Fix: Blind Draw Date Display Off-by-One in EST

### Problem
When you select `2026-03-07` in the date picker, the "No signups yet for..." message shows **March 6, 2026** instead of March 7. This happens because `new Date("2026-03-07")` parses as **UTC midnight**, which in EST is **March 6 at 7:00 PM**. Then `date-fns` `format()` uses local time, producing the wrong day.

### Root Cause
Lines 127 and 204 both do `format(new Date(selectedDate), 'MMMM d, yyyy')` where `selectedDate` is a `YYYY-MM-DD` string. The `new Date()` constructor treats date-only strings as UTC.

### Fix
Parse the date string with explicit local-time components to avoid the UTC shift. Replace `new Date(selectedDate)` with a helper that creates a local-time Date:

```typescript
// "2026-03-07" → new Date(2026, 2, 7) in local time
const [y, m, d] = selectedDate.split('-').map(Number);
const localDate = new Date(y, m - 1, d);
```

Apply this to both occurrences:
- **Line 127** (Clear All confirmation text)
- **Line 204** (empty state text)

### Files Modified
- `src/components/admin/blind-draw/BlindDrawSignupsTab.tsx` — fix two `new Date(selectedDate)` calls to use local-time parsing

