

## Fix Image Load Error Spam in Sentry and Console

### Problem
The Sentry logs show **hundreds** of "Image load error" events for the same teams repeating over and over. Two issues:

1. **`src/components/teams/shared/TeamImage.tsx`** uses `errorLog()` instead of `imageErrorLog()`. In production, `errorLog` sends every image failure to Sentry as an error-level event — flooding the monitoring system with non-actionable noise.

2. **Fallback image creates an error loop**: When the primary image fails, `TeamImage.tsx` sets `src` to an Unsplash fallback URL. If *that* also fails (e.g., network issue, Unsplash down), the `onError` fires again, logging another error — creating an infinite retry loop of Sentry events.

### Changes

**1. `src/components/teams/shared/TeamImage.tsx`**
- Replace `errorLog(...)` with `imageErrorLog(teamName, imageUrl)` (consistent with all other TeamLogo/TeamImage components)
- Instead of setting a fallback `src` (which can re-trigger `onError`), hide the broken image with `display: 'none'` — matching the pattern used in the newer `ui/team/TeamImage.tsx` and `shared/TeamLogo.tsx`
- Import `imageErrorLog` from `@/utils/logger` instead of `errorLog`

**2. `src/utils/logger.ts`**
- Add `"Image load error"` and `"Failed to load image"` to the Sentry filter so even if `errorLog` is accidentally used for image failures elsewhere, they won't be sent as Sentry events

### Result
- Image failures log as warnings in dev console only (via `imageErrorLog` → `warnLog`)
- No more Sentry spam from broken team logos
- No more infinite error loops from fallback image failures

