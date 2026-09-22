# Plan: make live updates stop failing

## What the logs show

Two different things, not one bug.

**1. A database restart (not your app).** At 09:09 and 09:12 the log shows
`terminating connection due to administrator command` and a `PUT /api/tenants/...`
call. That is Supabase restarting the live-update service for your project. Every
`connection not available ... queue_timeout`, `DatabaseConnectionDown` and
`SubscriptionDeletionFailed` line follows from that restart. Nothing in the app
code causes those.

The database itself looks healthy right now: 23 of 90 connections in use, no slow
queries, only 2 live subscriptions open.

**2. `MalformedJWT`, repeated every 2-3 seconds from 09:02 to 09:05.** This means a
browser tried to open a live-update connection with a login token the server could
not read. The app never refreshes the token it gives to the live-update socket, so
after a token expires or is cleared, every channel retries forever with the bad
token. I have not proved this is the exact cause, so step 1 below is to confirm it
before changing behavior.

## Steps

1. **Confirm the cause.** Log the token state when a channel fails, and reproduce a
   failure in the preview with an expired session. Report what the failure really is.
2. **Keep the live-update token fresh.** Push the new token to the live-update
   socket whenever the sign-in state changes or the token refreshes.
3. **Stop the endless retry.** Make the retry helper give up after a set number of
   attempts on an auth failure, and reconnect only after a new token arrives.
4. **Reduce noise during a restart.** A live-update outage should not spam the user
   with error toasts; the existing "connection lost" indicator is enough.
5. **Trim live-update tables.** 11 tables publish live changes. Confirm each one is
   still used, and drop the ones nothing listens to, so a restart has less work to
   redo. (Database change; I will list them for approval first.)

Steps 2-4 are app code only. Step 5 needs a migration and separate approval.

## Check

- Sign in, leave a page open past token expiry, confirm live updates keep working.
- Force a failed token, confirm retries stop instead of looping every 2 seconds.
- Watch the Realtime logs for an hour and confirm no new `MalformedJWT` lines.

## Technical details

- `src/integrations/supabase/client.ts` — set realtime options; the client is
  created with no realtime config today.
- New: push `session.access_token` into `supabase.realtime.setAuth()` on
  `SIGNED_IN` / `TOKEN_REFRESHED` / `SIGNED_OUT`, wired through
  `src/services/auth/AuthService.ts` and `src/contexts/AuthContext.tsx`.
- `src/hooks/realtime/subscribeWithRetry.ts` — add an attempt cap and an
  auth-failure path that waits for a token event rather than backing off forever.
- The 11 hooks that call `subscribeWithRetry` need no change.
- No changes to services, queries or types.
