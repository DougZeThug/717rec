# Add date + timestamp to notifications

## Goal
Every notification should clearly show when it was posted, not just a relative "5 minutes ago" string. The rest of the app standardizes on EST (America/New_York), so notifications will match that convention.

## What changes

**`src/components/notifications/NotificationItem.tsx`**
- Replace the single relative-time line ("5 minutes ago") with a two-line stamp:
  - Line 1 (small, primary): absolute date + time in EST, e.g. `May 21, 2026 · 3:42 PM EST`
  - Line 2 (muted, smaller): relative time, e.g. `about 2 hours ago`
- On narrow screens the stamp wraps under the title instead of fighting it for space.
- Tooltip on hover shows the full ISO timestamp for power users.

**`src/pages/admin/NotificationsAdmin.tsx`**
- The admin management list gets the same absolute EST stamp in its row metadata so admins can see exactly when each notification was posted and when it expires.
- `expires_at` (when set) also rendered in EST in the same format.

**New helper `src/utils/formatNotificationDate.ts`**
- Single function `formatNotificationDate(iso: string)` returning `{ absolute, relative, iso }`.
- Uses `toLocaleString('en-US', { timeZone: 'America/New_York', ... })` per the project's existing timezone convention (see `mem://architecture/event-date-timezone-handling-est`).
- Reused by both the popover item and the admin page so formatting stays consistent.

## What stays the same
- Unread badge logic, realtime updates, RLS, and the underlying `created_at` / `expires_at` columns are unchanged — display-only work.

## Out of scope
- No per-user "local timezone" toggle. The whole app uses EST today; introducing a user-pref timezone would be a separate, larger feature. If you'd rather have local-browser time instead of EST, say the word and I'll swap the formatter — it's a one-line change in the helper.

## Verification
- Open the bell on desktop and mobile: each notification shows the EST date/time and the relative string under it.
- Admin page `/admin/notifications`: list rows show posted-at and expires-at in EST.
- Hover tooltip shows ISO timestamp.
