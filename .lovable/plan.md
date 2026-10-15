# Join the League

## Goal
Give new players a clear way to join 717REC from the home page.

## Steps
1. Add a public Join page with Doug's confirmed night, address, team fee, team size, solo option and January 7, 2027 start.
2. Add a Join button on the home page without removing its current links.
3. Send team and solo sign-ups to the existing league contact form. Add a solo checkbox so a solo player does not need a team name.
4. Add page and form tests. Check the home-to-sign-up path and page layout.

## Technical details
- New `src/pages/Join.tsx`; register `/join` in `src/App.tsx`.
- Use existing league logo, semantic tokens, `PageLayout`, `SeoHead` and `Button`.
- Change `HeroSection.tsx` and the join-only presentation in `ContactForm.tsx`.
- Solo requests use the existing join request type and a clear “Solo player” label; no new stored fields.
- Add the page to the sitemap and llms list; record its form reuse in `AGENTS.md`.
- No dependency, database, history or scoring changes. No hand-apply step.

## Acceptance and rollback
Both solo and team players can reach the existing request form. Team-name checks still apply to team sign-ups. Tests pass and the preview shows no page errors. Rollback removes the new page, links and solo form option; stored requests remain unchanged.