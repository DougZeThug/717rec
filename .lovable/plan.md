## Goal
Resolve the `score_submissions_no_insert_policy` scanner finding. The intended flow is correct (admins review submissions; anonymous/authenticated direct inserts are blocked), so the fix is documentation + finding management, not new policies.

## Background
- `score_submissions` has SELECT (authenticated) and UPDATE (admins) policies, and INSERT was deliberately revoked from `anon` and `authenticated` in migration `20260603195133_…`.
- All new submissions flow through the `submit-score-report` edge function, which validates input and inserts with the service role (bypassing RLS, which is the intended pattern).
- Admins approve/reject submissions via the existing UPDATE policy; on approval, scores are applied to the match.

## Plan

1. **Migration: add a `COMMENT ON TABLE` to `public.score_submissions`** describing the access model:
   - Inserts only via `submit-score-report` edge function (service role).
   - No direct INSERT policy is intentional.
   - Admins review/apply via UPDATE policy.

2. **Update `mem://security/security-memory`** with a short note: `score_submissions` has no INSERT policy by design — submissions go through the `submit-score-report` edge function with service role. Future scans should not flag this.

3. **Mark the scanner finding as fixed** (`supabase_lov` / `score_submissions_no_insert_policy`) with an explanation pointing to the table comment and edge function.

## What I will NOT change
- No new RLS INSERT policy (would weaken the current model).
- No edge function or client changes.
- No other findings on the More panel (those are separate items).
