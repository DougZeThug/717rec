

## Add Summary Previews to Report Card and Rivalry Sections

### Changes

**1. `src/components/teams/TeamReportCard.tsx`**
- Pass `summaryValue` to the `CollapsibleSection` showing the overall grade (e.g. "A-")
- The grade is already available from `grades.overall.grade`

**2. `src/components/teams/RivalryHighlights.tsx`**
- Pass `summaryValue` to the `CollapsibleSection` showing the top rival name (e.g. "VS. Cuzzo's Clinic")
- The rival name is already available from `topRival.opponent_name`

### Technical Details

Both components already use `CollapsibleSection` which supports the `summaryValue` prop (added in the earlier redesign). Just need to wire the data through.

- `TeamReportCard`: Add `summaryValue={grades?.overall.grade}` to the CollapsibleSection
- `RivalryHighlights`: Add `summaryValue={topRival ? \`VS. ${topRival.opponent_name}\` : undefined}` to the CollapsibleSection

Two small edits, no new files.

