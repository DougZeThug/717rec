## Problem

The `user_fk_hardening.sql` smoke test deletes a row from `auth.users`. The FK `messages.user_id -> auth.users(id) ON DELETE SET NULL` cascades an UPDATE on `messages.user_id = NULL`, which fires the `trg_enforce_messages_identity` trigger. Because the DELETE runs in a system context with no auth session, `auth.uid()` is NULL and the trigger raises `Authentication required` / `user_id must match the authenticated user`, breaking the cascade.

The trigger's identity checks are meant for user-driven inserts/updates, not FK cascades from `auth.users` deletion.

## Fix

Update `public.enforce_message_identity()` to short-circuit for the FK SET NULL cascade path — i.e. when no auth session exists and the update is nulling out `user_id`:

```sql
-- Allow FK ON DELETE SET NULL cascades from auth.users:
-- no auth session AND update is clearing user_id.
IF TG_OP = 'UPDATE'
   AND auth.uid() IS NULL
   AND NEW.user_id IS NULL
   AND OLD.user_id IS NOT NULL THEN
  RETURN NEW;
END IF;
```

Everything else (INSERTs, real UPDATEs) still enforces identity and username/team overrides as before. No RLS or grant changes.

## Steps

1. New migration replacing `public.enforce_message_identity()` with the cascade-exempt branch added at the top of the function body. Triggers themselves are unchanged.
2. Re-run the `user_fk_hardening.sql` smoke to confirm the auth.users delete cascade now succeeds.

## Technical notes

- Guard is intentionally narrow: only fires on UPDATE, only when no session, only when NEW.user_id is NULL and OLD.user_id was not — matches the FK cascade shape and can't be triggered by an authenticated client (they always have `auth.uid()`).
- `messages.username` is preserved (as designed by PR-06's inline-username rationale); we don't touch it in the cascade path.
- `match_comments` uses ON DELETE CASCADE so the row is deleted before the trigger would fire — no change needed there, but the same function safely covers it.
