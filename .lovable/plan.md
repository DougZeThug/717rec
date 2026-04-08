

## Fix: Remove `.in('team_id', teamIds)` filter from bulk team_details_archive query

### Problem

In `CareerBulkFetchService.ts`, the `team_details_archive` query filters by `.in('team_id', teamIds)`, which excludes opponent division history. When `calculateDivisionRecords` looks up an opponent's division via `teamDivisionMap`, the entry is missing and the match is silently skipped. The single-team path (`CareerFetchService.ts`) correctly fetches all rows unfiltered.

### Fix

**`src/services/career/CareerBulkFetchService.ts`** (line 158)

Remove `.in('team_id', teamIds)` from the `team_details_archive` query so opponent division history is included — matching the single-team path.

```typescript
// Before
supabase
  .from('team_details_archive')
  .select('team_id, season_id, divisionname')
  .in('team_id', teamIds),

// After
supabase
  .from('team_details_archive')
  .select('team_id, season_id, divisionname'),
```

Update the comment on line 154 to clarify why it's unfiltered.

### Scope

1 line removed in 1 file. No logic or schema changes.

