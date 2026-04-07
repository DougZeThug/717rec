
Goal: make each season look like a compact recap card first, not an always-visible accordion header. On mobile, the collapsed view should match the reference structure: champions/logos on the left, season highlights on the right, and the detailed standings hidden behind a dedicated “Full Season Recap” dropdown/button.

Build
1. Redesign the collapsed season summary in `src/components/history/SeasonAccordion.tsx`
   - Keep the outer season card, but replace the current text-only header with a 3-part mobile layout:
     ```text
     [ Season name / date / status ]
     [ Champions box ] [ Highlights box ]
     [ Full Season Recap ▾ ]
     ```
   - Left box: show champion teams for that season with logo + name. If multiple champions exist, stack them compactly. If no champion yet, show a simple fallback state.
   - Right box: show compact season highlights pulled from existing season data, such as:
     - Most Wins
     - Highest Power Score
     - Most Game Wins
     - optionally teams/matches if space is tighter than expected
   - Bottom row: a dedicated recap control with chevron that opens/closes the existing standings content.

2. Keep the detailed recap content the same underneath
   - Do not change the team cards or standings table layout you already approved.
   - The division panels and season standings stay inside the expandable area.
   - This keeps the redesign focused on the collapsed season card only.

3. Reduce the “accordion feel”
   - Make the whole header no longer behave like a big padded accordion trigger.
   - Move expand/collapse behavior to the dedicated recap row/button so the UI feels closer to the reference image.
   - Tighten internal spacing so the summary card reads as a denser dashboard-style recap.

Technical details
- `src/components/history/SeasonAccordion.tsx`
  - Rebuild the mobile collapsed layout into a two-column summary section.
  - Use existing `seasonData` to derive champion entries and highlight stats.
  - Reuse `TeamLogo` for winner logos.
  - Keep the current Framer Motion expand/collapse section, but trigger it from the recap row/button instead of the whole top block.

- `src/components/history/SeasonMetaBar.tsx`
  - Either:
    - add a compact “highlights” variant that can be reused in the collapsed card, or
    - extract the highlight calculations so both the collapsed summary and expanded bar stay consistent without duplicating logic.
  - This keeps “season highlights” aligned in both places.

Scope
- Primary file: `src/components/history/SeasonAccordion.tsx`
- Secondary cleanup/reuse file: `src/components/history/SeasonMetaBar.tsx`
- No changes to team cards, historical standings rows, or current standings styling.

Result
- Mobile seasons will read like recap cards instead of oversized accordions.
- Champions and logos become the visual anchor on the left.
- Highlights become immediately scannable on the right.
- Full standings stay available, but only when the user opens the recap dropdown.
