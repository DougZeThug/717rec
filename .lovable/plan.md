# Two problems, not one — plan revised after your correction

Thanks for the correction on the 18 completed matches (those were you, not players). Progressier's numbers are the honest signal, and they show **two separate issues**:

| | Jul 16 |
|---|---|
| Actual app launches (Progressier: 39 iOS + 13 Android) | **52** |
| Typical Thursday launches | ~100 |
| Lovable dashboard "visitors" | 14 |
| Google Analytics (already installed, `G-C2L4XZJ00B`) | unknown — you'd need to check GA4 |

So the truth is:

- **Problem A — Real slowdown.** ~52 launches vs ~100 typical is a genuine ~50% dip in humans opening the app. Not zero, not "blocked", but real.
- **Problem B — Chronic undercount.** Lovable's dashboard shows 14 when Progressier saw 52 (~27%). This is not a Jul 16 bug; it's every day.

## Root cause of Problem B (found in your code)

`src/utils/analytics.ts` currently loads Google Analytics like this:

```ts
if ('requestIdleCallback' in window) {
  requestIdleCallback(loadAnalytics, { timeout: 8000 });
} else {
  setTimeout(loadAnalytics, 5000);
}
```

That's an **up to 8-second delay** before the GA script is even requested. On a mobile PWA where a user opens the app for 30–90 seconds to check the schedule and closes it, `gtag.js` often never finishes loading, so **no pageview event is sent at all**. This disproportionately hits your audience (85.9% mobile, heavy PWA use, short check-the-schedule sessions), and it also affects Lovable's own dashboard because its beacon runs in the same tab lifecycle.

## Root cause of Problem A (honest answer: I can't diagnose it from code)

There's no evidence in the codebase or DB of anything blocking anyone on Jul 16 — no code changes to `index.html`, service worker, CSP, or auth in the Jul 10–17 window. A ~50% Thursday dip is more likely a real-world cause the code can't see:

- No weekly reminder push went out (Progressier pushes are manual; you can confirm from the Progressier dashboard)
- Weather / event conflict / off-schedule week
- A specific link (Facebook post, group text) that normally drives Thursday spikes wasn't sent

I don't have visibility into any of those from inside the app. The plan below adds instrumentation so we can *see* Problem A next time it happens instead of guessing.

## Plan

### Step 1 — Fix the GA loading window (small, safe, immediate)

Edit `src/utils/analytics.ts`:

- Drop the `requestIdleCallback(..., 8000)` gate.
- Load GA on `document` idle with a **1-second** ceiling instead of 8s.
- Send the first pageview using `navigator.sendBeacon` (via GA4's `transport_type: 'beacon'`) so it survives users closing the tab mid-load.
- Also fire pageviews on the `pagehide`/`visibilitychange=hidden` events, not only on route change.

This alone should recover most of the missing mobile pageviews without adding any new infra.

### Step 2 — Add a first-party pageview beacon (source of truth for admin)

Because GA still relies on client-side script execution (adblockers, iOS "Limit IP Tracking", CSP quirks all kill it), add a tiny first-party count that Lovable's dashboard can't miss:

- New table `public.page_views` with `path text`, `ua_class text` (mobile-ios / mobile-android / mobile-other / desktop), `anon_day_id text` (salted daily hash — no PII, no auth join), `created_at timestamptz`.
- Grants: `INSERT` for `anon` + `authenticated`; `SELECT` restricted to admins via `has_role`.
- New edge function `pageview` (no JWT required): validates payload, rate-limits via existing `rate_limit_events`, inserts one row.
- New hook `useFirstPartyPageview()` mounted once in `src/App.tsx`, uses `useLocation()` + `navigator.sendBeacon`, dedupes rapid double-fires.

### Step 3 — Surface it on the League Night Status admin tab

Extend `LeagueNightStatusTab.tsx` (built in PR-13) with a "Real daily traffic (first-party)" section:

- New `TrafficService.fetchDailyTraffic(days)` + `useDailyTraffic()` hook.
- Simple daily sparkline of distinct `anon_day_id` counts, last 30 days.
- Small "device split" pill (iOS / Android / desktop) for the last 7 days.

This becomes your ground truth. When the next "did traffic drop?" question comes up, you can answer it in one glance instead of interpreting Lovable's dashboard.

### Step 4 — Do NOT touch (explicitly out of scope)

- No Progressier / service worker / CSP changes — they're working.
- No Lovable dashboard changes — we can't modify it; we're adding a parallel truth source.
- No third-party analytics vendor.
- No PII, no auth-user join, no per-user tracking. The daily anon ID is `sha256(ip + user-agent + date + server_salt)` and rotates every 24h.

## Technical notes

- **`src/utils/analytics.ts`**: replace the 8s idle wait with `requestIdleCallback(loadAnalytics, { timeout: 1000 })` and eagerly load if `document.readyState === 'complete'`. Pass `{ transport_type: 'beacon' }` to `gtag('config', ...)` and to every `event` call. Add a one-time listener on `visibilitychange` to flush a pageview if the current path hasn't been reported yet.
- **New table `public.page_views`** (migration): `id uuid pk default gen_random_uuid()`, `path text not null check (char_length(path) <= 256)`, `ua_class text not null check (ua_class in ('mobile-ios','mobile-android','mobile-other','desktop'))`, `anon_day_id text not null`, `created_at timestamptz not null default now()`. Index on `(created_at desc)` and `(created_at, anon_day_id)`. RLS on: `INSERT policy USING (true) WITH CHECK (true)` for `anon, authenticated`; no SELECT policy for public roles. `GRANT INSERT ON public.page_views TO anon, authenticated; GRANT ALL ON public.page_views TO service_role;`.
- **View `public.v_daily_traffic`** with `security_invoker = on`: `SELECT date_trunc('day', created_at)::date AS day, count(DISTINCT anon_day_id) AS visitors, count(*) AS pageviews, count(DISTINCT anon_day_id) FILTER (WHERE ua_class LIKE 'mobile-%') AS mobile_visitors FROM public.page_views GROUP BY 1`. SELECT via a wrapper policy that checks `has_role(auth.uid(), 'admin')`.
- **Edge function `supabase/functions/pageview/index.ts`**: `verify_jwt = false` in `supabase/config.toml`, uses `PAGEVIEW_SALT` secret (add via `secrets--generate_secret`), hashes `x-forwarded-for + user-agent + YYYY-MM-DD + salt` → 16-char hex `anon_day_id`, validates path length, calls `rate_limit_events` (per-IP, 60/min), inserts row. Returns 204.
- **`src/hooks/useFirstPartyPageview.ts`**: `useEffect` on `useLocation().pathname`, builds `ua_class` from `navigator.userAgent`, calls `navigator.sendBeacon('/functions/v1/pageview', body)` with `fetch keepalive` fallback. Dedupe: skip if same pathname fired in last 500ms.
- **`src/services/traffic/TrafficService.ts`** + **`src/hooks/useDailyTraffic.ts`**: standard service/hook pattern, `staleTime: 5 min`.
- **UI**: extend `LeagueNightStatusTab.tsx` with a `TrafficMiniChart` component (uses your existing `recharts` `LineChart`, matches the snapshot cards' styling).
- **Tests**: hook unit test (fires once per navigation, dedupes double-fires, sends correct `ua_class`), edge function test (rejects long path, respects rate limit, hashes deterministically), SQL smoke test (`page_views` unreadable by anon/authenticated, view returns rows for admin), analytics.ts test (loads GA within 1s idle window).

## What you'll do to verify

1. After Step 1 ships, check the GA4 Realtime dashboard on your phone — open the app, close it after 5 seconds, confirm the pageview shows up. Today it almost certainly doesn't.
2. After Step 3 ships, next Thursday compare Progressier launches vs. the new "Real daily traffic" card in League Night Status. They should be in the same ballpark (Progressier counts SW-served relaunches; ours counts navigations — some drift is expected but they'll track together).
3. If a future Thursday looks quiet, you can now tell whether it's a reporting gap (first-party count is normal) or a real slowdown (first-party count is down too) in one glance.
