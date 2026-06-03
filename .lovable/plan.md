## Goal
Fix security finding `score_submissions_anonymous_insert` by mirroring the proven `contact_requests` pattern: remove the anonymous INSERT RLS policy and route submissions through a validated, rate-limited edge function.

## Changes

### 1. New edge function: `submit-score-report`
Modeled directly on `supabase/functions/submit-contact-request/index.ts`:
- CORS allow-list (same origins).
- Zod payload schema with hard length caps:
  - `match_id`: uuid
  - `submitter_name`: 1–120 chars
  - `submitter_team`: optional, max 120 chars
  - `message`: 1–2000 chars
  - `website`: honeypot
- Rate limit via shared `checkRateLimit` helper: 5 submissions per 10 minutes per IP hash (`ENDPOINT_KEY = 'submit-score-report'`).
- Verify match exists before inserting.
- If a JWT is present, look up profile/team and prefer verified name/team (same pattern as contact requests).
- Inserts via service role into `score_submissions` (bypasses RLS).

### 2. Migration
- Drop policy `"Allow anonymous score submissions"` on `public.score_submissions`.
- Add CHECK constraints as defense-in-depth: `submitter_name <= 120`, `submitter_team <= 120`, `message <= 2000`.
- Keep existing admin UPDATE and authenticated SELECT policies untouched.
- Revoke `INSERT` on `score_submissions` from `anon` (service role retains access).

### 3. Client wiring
- Replace the direct `supabase.from('score_submissions').insert(...)` call in `src/services/matches/MatchWriteService.ts` (`createScoreSubmission`) with `supabase.functions.invoke('submit-score-report', { body: {...} })`.
- Handle 429 (rate-limited) and 400 (validation) with friendly toast messages in the caller (`usePendingScoresMatches`).
- No UI changes needed in `ScoreSubmissionModal`; signature of `createScoreSubmission` stays the same.

### 4. Tests
- Update `src/services/matches/__tests__/MatchQueryService.test.ts` (or the relevant write-service test) to mock `supabase.functions.invoke` instead of `.from('score_submissions').insert`.
- Verify modal test still passes.

## Verification
- Build passes.
- Targeted vitest run for the score-submission tests.
- Manually confirm the edge function deploys (auto) and the modal flow still submits.

## Out of scope
The other findings shown in the More panel (season_team_participation, teams update policy, realtime, username spoofing, etc.) — they were not part of this request.