## Plan: Add SeoHead to the homepage

### What we're doing
Add the existing `SeoHead` component to the homepage (`src/pages/Index.tsx`) so it sets the page title, meta description, canonical URL, and Open Graph/Twitter tags on the `/` route.

### Changes
1. Import `SeoHead` from `@/components/seo/SeoHead` in `src/pages/Index.tsx`.
2. Place `<SeoHead ... />` at the very top of the `Index` component's return, before the `PageLayout`.
3. Use the same title and description already present in `index.html`:
   - Title: "717REC — Lancaster's Premier Cornhole League"
   - Description: "Standings, schedules, team rankings, and playoff brackets for Lancaster PA's premier recreational cornhole league."
   - Path: `/`
4. Remove the static `<link rel="canonical" href="https://717rec.app/" />` from `index.html` so the per-route canonical owns the homepage (matches the rest of the site pattern).

### Verification
- Run `npm run typecheck` to confirm TypeScript is happy.
- Optionally run the homepage test to make sure no render regressions.

### Notes
- No new dependencies are needed; `SeoHead` and `react-helmet-async` are already in use.
- This keeps the homepage consistent with the other pages (Stats, Teams, Playoffs, etc.) that already use `SeoHead`.