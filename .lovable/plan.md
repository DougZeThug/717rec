

## Fix: Update `hero_cards_card_type_check` Constraint

### Problem
The database has a CHECK constraint on `hero_cards.card_type` that only permits four values: `standard`, `champions`, `event`, `announcement`. The TypeScript code defines additional types (`participation`, `request`, `flyer`) that the constraint rejects, causing the insert to fail.

### Change

**Database migration** — Drop and recreate the check constraint to include all card types:

```sql
ALTER TABLE hero_cards DROP CONSTRAINT hero_cards_card_type_check;
ALTER TABLE hero_cards ADD CONSTRAINT hero_cards_card_type_check 
  CHECK (card_type = ANY (ARRAY[
    'standard', 'champions', 'event', 'announcement', 
    'participation', 'request', 'flyer'
  ]));
```

No code changes needed — the TypeScript types already list all seven values.

### Files Modified
- Database migration only (one ALTER TABLE statement)

