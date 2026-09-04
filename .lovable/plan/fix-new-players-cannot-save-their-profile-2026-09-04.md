# Fix: new players cannot save their profile

## What happened

Ike's error toast is not a one-off. **Nobody has been able to save a profile for months.** The last five people who signed up all have a blank name on their account.

Two things are wrong with the profile table in the database:

1. **The app has no permission to read or write the profile table at all.** The permission list for that table is completely empty. Every read and every save is refused before any rule is even checked.
2. **There is no rule that lets a person create their own profile row.** Saving a name uses a "create-or-update" write, which needs both a create rule and an update rule. Only the update rule exists.

Confirmed by querying the live database:
- Table permissions for `public.profiles`: none, for any role.
- Policies present: SELECT and UPDATE only. No INSERT.
- The five most recent accounts (created Apr 23, May 1, May 21, Sep 3 x2) all have an empty username.

## The fix (database only)

One migration, nothing else:

```sql
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));
```

Notes:
- No `anon` grant — profiles stay readable only by the owner and admins, exactly as the existing read rule says.
- No DELETE grant — deleting profiles is not a thing the app does.
- The existing SELECT and UPDATE rules are left untouched. The update rule still blocks anyone from making themselves an admin.
- No app code changes. The profile screen and its save call are already correct.

## After applying

- Sign in as a test account and save a name — the toast should be a success.
- Re-check that the five blank accounts can now set a name (they will be prompted on next sign-in).
- Confirm admin screens that read profiles still work.
