

## Plan: Add DELETE Trigger for Match-to-Playoff Sync

### The problem

The sync triggers on the `match` table only cover INSERT and UPDATE. When a bracket is deleted, the `match` rows are removed but the corresponding `playoff_matches` rows remain as orphans.

### The fix

One migration that adds:

1. **A DELETE trigger function** (`sync_match_delete_to_playoff_matches`) -- when a row is deleted from `match`, it deletes the corresponding `playoff_matches` row where `match_id = OLD.id`.

2. **The trigger** (`trg_sync_match_delete_to_playoff`) -- AFTER DELETE on `public.match`, fires the function above.

This completes the sync lifecycle: INSERT creates the playoff_match, UPDATE keeps it current, DELETE removes it.

### Technical detail

```sql
CREATE OR REPLACE FUNCTION public.sync_match_delete_to_playoff_matches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM playoff_matches WHERE match_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_sync_match_delete_to_playoff
  AFTER DELETE ON public.match
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_match_delete_to_playoff_matches();
```

### What changes

- **1 migration file** -- adds the delete trigger function and attaches it
- **0 code changes** -- existing bracket deletion code already deletes from the `match` table; this trigger handles the rest automatically

