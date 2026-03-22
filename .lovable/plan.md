

## Fix: Weekly Recap showing only Hot Streaks

### Problem
Two issues prevent Upsets and Movers from appearing:

**Movers (bug):** Double-slicing removes too many items.
- `Index.tsx` passes `risers={trendData?.trends?.slice(1)}` (removes index 0, used for Team of the Week)
- `WeeklyRecapCard.tsx` then does `risers.slice(1)` again in the render, dropping another item
- With 3 trends fetched, after double-slice only 1 item remains — but `hasMovers` requires `risers.length > 1`
- Result: Movers section never appears

**Upsets (threshold too strict):** The 15-point career power score gap threshold may be filtering out all results for most weeks. Lowering to 10 would surface more upsets.

### Changes

1. **`src/components/home/WeeklyRecapCard.tsx`**
   - Remove the extra `.slice(1)` in the Movers render — just use `risers.map(...)` since slicing already happened in `Index.tsx`
   - Change `hasMovers` condition from `risers.length > 1` to `risers.length > 0`

2. **`src/services/WeeklyRecapService.ts`**
   - Lower `UPSET_POWER_SCORE_THRESHOLD` from `15` to `10` to surface more upsets
   - Increase max upsets returned from 2 to 3

