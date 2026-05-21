## Goal

Replace the rotating "Join the league / Standings / New season" panel on the homepage with a **Contact form**. Visitors pick a request type and submit a message; admins see every submission in the admin notifications page.

## Visitor experience

Bottom-of-homepage card titled "Send us a message".

**Request type** (dropdown, required):
- Timeslot change
- Score update / correction
- Join the league
- General message
- Other

**Always-shown fields** (for every request type, signed in or not):
- Team name
- Your name
- Contact (email or phone)
- Message

**Extra fields when "Join the league" is selected:**
- Players (textarea — names of all teammates)
- (Team name field re-labelled "Proposed team name")

**If the user is signed in:**
- Name auto-fills from their profile (full_name → username)
- Team name auto-fills from their approved team membership
- Both fields show a small "✓ Verified" badge and are locked (read-only)
- Contact + Message still required
- The stored row is marked `is_verified = true` with `user_id` + `team_id` attached

**If not signed in:** all fields are editable; row stored as unverified.

Hidden honeypot field + rate-limit on the edge function (5 per 10 min per IP).

## Admin experience

The existing **Admin → Notifications** page gets a new "Contact inbox" section above the post-notification form, listing newest-first submissions with:

- Type badge (color-coded per category)
- Verified badge if `is_verified`
- Submitter name + team + contact (mailto/tel link)
- Full message
- EST timestamp
- **Mark resolved** and **Delete** buttons

A small count chip in the section header shows unresolved requests. Realtime subscription updates the list as new ones arrive.

## Data model

New table `contact_requests` (migration already drafted in this plan):

- `request_type` — `timeslot | score | join_league | general | other`
- `submitter_name`, `submitter_team`, `submitter_contact`
- `players` (used by Join the league)
- `message`
- `user_id`, `team_id`, `is_verified` (filled when signed-in submission is verified server-side)
- `status` (`new` | `resolved`), `admin_notes`, `resolved_by`, `resolved_at`

**Access:** admins only for select/update/delete. **Inserts only via edge function using the service role** — no public INSERT policy, so the client can never write arbitrary rows.

## Submission flow

New edge function `submit-contact-request`:

1. Validates payload with zod (length caps, request_type whitelist, honeypot).
2. Rate-limits by hashed IP (shared `_shared/rateLimit.ts` helper).
3. If `Authorization: Bearer …` header is present, decodes the JWT, looks up the user's profile + approved team membership, and **overrides** the submitted name/team with the verified values; sets `is_verified = true`. Otherwise stores as anonymous.
4. Inserts the row with the service-role client.

No email is sent — admins read submissions in-app. (Easy to add Resend later if you want a notification email too.)

## Files to add / edit

**New**
- `supabase/functions/submit-contact-request/index.ts`
- `src/services/contact/ContactRequestService.ts` — fetch list, mark resolved, delete (admin only)
- `src/hooks/contact/useContactRequests.ts` — query + mutations + realtime subscription
- `src/components/home/ContactPanel.tsx` — the new homepage card and form (replaces `CallToAction` slot)
- `src/components/admin/contact/ContactInboxSection.tsx` — admin list UI

**Edited**
- `src/pages/Index.tsx` — swap `CallToAction` import for `ContactPanel`
- `src/pages/admin/NotificationsAdmin.tsx` — render `ContactInboxSection` at the top

`CallToAction.tsx` stays in the repo unused (easy revert).

## Verification after build

- Submit each request type as a signed-out user → row appears in admin inbox with the entered name/team, `is_verified = false`.
- Sign in, submit again → name/team are locked, row stored with `is_verified = true`, `user_id` + `team_id` populated.
- Admin clicks **Mark resolved** → row moves to "resolved" state; **Delete** removes it.
- Rate-limit test: 6th rapid submit returns 429.

Ready for build mode — say the word and I'll implement it.