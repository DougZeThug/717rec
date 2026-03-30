

## Fix: Prevent Self-Escalation via profiles UPDATE Policy

### Problem
The current `Users can update own profile` policy only checks `auth.uid() = id` — it doesn't restrict which columns can be changed. A user could set `is_admin = true` on their own row and gain full admin access.

### Fix

**One migration** — replace the UPDATE policy with a WITH CHECK that ensures `is_admin` stays unchanged:

```sql
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
);
```

This allows users to update `username`, `full_name`, `avatar_url` freely, but any attempt to change `is_admin` will be rejected because the WITH CHECK compares the new value against the current value.

### Why not a trigger?
A trigger would work but adds complexity. The WITH CHECK approach is simpler and enforced at the policy level — no extra function needed.

### Note on recursion
The subquery `SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid()` references the same table. Since this is in a WITH CHECK (not USING), and the USING clause already restricts to the user's own row, Postgres evaluates this without recursion issues. However, if the linter flags it, we can wrap it in a `SECURITY DEFINER` function instead.

**One migration file, no code changes.**

