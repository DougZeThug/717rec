

## Consolidate Team Details Sections

Currently there are 10 sections visible on the page. Several are closely related and can be grouped to reduce the list from 10 to 6:

### Proposed groupings

| Current sections | Merged into |
|---|---|
| Rivalry Highlights + Head-to-Head Records | **Matchups & Rivalries** (single collapsible, rivalry highlights on top, H2H table below) |
| Career Statistics + Career Power Score Trend | **Career** (single collapsible, totals on top, chart below) |
| Team Stats & Advanced + Report Card | **Stats & Report Card** (single collapsible with tabs or stacked: stats first, report card below) |

### Result: 6 sections instead of 10

1. **Performance Cards** (always visible)
2. **Roster** (default open)
3. **Stats & Report Card** — combines current stats/advanced + report card. Summary shows record + grade (e.g. "2-4 · C")
4. **Matchups & Rivalries** — combines rivalry highlights + H2H records. Summary shows top rival
5. **Match History** — unchanged
6. **Career & Achievements** — combines career stats + power score trend + achievements. Summary could show total career matches or badge count

### Changes

**`src/pages/TeamDetails.tsx`**
- Merge sections 3+4 (Stats & Report Card) into one `CollapsibleSection`
- Merge sections 5+6 (Rivalry + H2H) into one `CollapsibleSection` titled "Matchups & Rivalries"
- Merge sections 7+8+9 (Career Stats + Career Power Score Trend + Achievements) into one `CollapsibleSection` titled "Career & Achievements"
- Remove individual `CollapsibleSection` wrappers from `TeamReportCard` and `RivalryHighlights` — render their content directly inside the parent collapsible
- Update sticky nav section IDs accordingly

**`src/components/teams/TeamDetailsStickyNav.tsx`**
- Update nav items to match the 6 sections

**`src/components/teams/TeamReportCard.tsx`**
- Export inner content separately (or add a `renderContent` mode) so it can be embedded without its own collapsible wrapper

**`src/components/teams/RivalryHighlights.tsx`**
- Same: export content without collapsible wrapper for embedding

### Technical details
- `TeamReportCard` and `RivalryHighlights` currently wrap themselves in `CollapsibleSection`. Add a `standalone={false}` prop (or similar) to render just the content without the wrapper, so the parent page controls the collapsible
- Combined summary values: `summaryValue={`${team.wins}-${team.losses} · ${grade}`}` for Stats & Report Card

