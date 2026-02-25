

## Make Blind Draw Signups Date-Independent

### Problem
The admin must manually select a date (defaulting to the next Thursday) to view blind draw signups. Since there's only ever one blind draw at a time, this date picker is unnecessary friction and introduces timezone bugs.

### Approach
Remove the date filter from the admin view entirely — always show **all current signups**. The "Clear All" button clears all signups (not filtered by date). The public signup form still stores the event date for record-keeping, but the admin just sees one flat list.

### Changes

#### 1. `src/components/admin/blind-draw/BlindDrawSignupsTab.tsx`
- Remove the date state, date picker input, `calculateThursdayDate`, and the `useEffect` that sets it
- Remove the `Calendar`, `Label`, `Input` imports and the date selector UI
- Call `useBlindDrawSignups()` with **no date filter** (fetch all signups)
- Update `useClearBlindDrawSignups` to clear all signups (no date param)
- Remove date-formatted text from "No signups" and "Clear All" confirmation messages — just say "all signups"

#### 2. `src/hooks/useBlindDrawSignups.ts`
- `useBlindDrawSignups()`: Make `eventDate` truly optional — when not provided, fetch all signups (already works this way since the `if (eventDate)` guard skips the filter)
- `useClearBlindDrawSignups()`: Change to delete **all** rows instead of filtering by `event_date`, since there's only one active blind draw at a time
- `useBlindDrawSignupCount()`: Make it work without a date param — count all rows when no date is provided (use a simple `.select('id', { count: 'exact', head: true })` instead of the RPC)

#### 3. `src/components/home/BlindDrawSignupForm.tsx`
- Keep `eventDate` prop — the public form still associates signups with an event date for data integrity. No changes needed here.

#### 4. `src/components/hero/EventHeroCard.tsx`
- Update `useBlindDrawSignupCount` call to not pass a date — count all current signups regardless of date

### Summary
- Admin tab: remove date picker, show all signups, "Clear All" clears everything
- Hooks: make date filtering optional, clear-all deletes all rows
- Public form: unchanged (still stores event date)
- Hero card: count all signups without date filter

### Files Modified
- `src/components/admin/blind-draw/BlindDrawSignupsTab.tsx`
- `src/hooks/useBlindDrawSignups.ts`
- `src/components/hero/EventHeroCard.tsx`

