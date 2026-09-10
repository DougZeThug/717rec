# Table Patterns Guide

## Component Selection

### Use `ResponsiveTable` for:

- Any new table of rows and columns
- Any table an admin or member might open on a phone
- Any table that today renders a second, separate "mobile card" component

`ResponsiveTable` automatically:

- Shows a real `<table>` from 768px up (Tailwind `md`)
- Shows a stack of cards below it, labelled from the same column headings
- Names itself for a screen reader (a hidden `<caption>`, or the list's label)
- Gives every heading `scope="col"`

### Use `Table` directly for:

- A table narrow enough to read on a phone as-is (three short columns or fewer)
- A table with a shape `ResponsiveTable` does not cover — see **Exceptions**

### Never hand-write `<th>`

`TableHead` supplies `scope="col"`. A hand-written `<th>` does not, and a
heading with no `scope` tells a screen reader nothing about which column it
names. Fifteen tables in this app relied on each author remembering; three did.

## `ResponsiveTable` Pattern

Columns are **data, not JSX**. That is the whole point: a heading and the label
it gets on a phone are physically the same string, so they cannot drift apart.

```tsx
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table';

interface TeamRow {
  id: string;
  name: string;
  power: number;
  division: string;
}

// Declare this at module scope, not inside the component — it never changes.
const teamColumns: ResponsiveTableColumn<TeamRow>[] = [
  { id: 'name', header: 'Team', card: 'title', cell: (t) => t.name },
  { id: 'power', header: 'Power', align: 'right', cell: (t) => t.power.toFixed(1) },
  { id: 'division', header: 'Division', card: 'hidden', cell: (t) => t.division },
];

<ResponsiveTable
  caption="Season standings"
  columns={teamColumns}
  rows={teams}
  rowKey={(t) => t.id}
  empty={<p className="text-center text-muted-foreground py-8">No teams yet</p>}
/>;
```

### `card` — where a column goes on a phone

| Value       | Effect                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `'title'`   | First line of the card, no label. Use for the team or person name.                                                                        |
| `'meta'`    | A "Heading: value" line in the card body. **The default.**                                                                                |
| `'block'`   | The heading on its own line, then the value at full width below. For content too wide to sit beside a label — a badge list, a `<Select>`. |
| `'actions'` | Pinned to the bottom of the card, no label.                                                                                               |
| `'hidden'`  | Not shown on a phone at all.                                                                                                              |

### `caption` is required, and is not decoration

It is the table's accessible name. Write what the table _is_
("Season participation by team"), not what the page already says.

### `mode` is for tests

`mode="table"` and `mode="cards"` force a rendering, so a test can assert one
without mocking `useIsMobile`. Application code leaves it alone.

## Why it switches in JavaScript, not CSS

The obvious alternative is one DOM with `::before` data-labels on each `<td>`.
It was rejected:

- Stacking cells needs `display:block` on `table`/`tr`/`td`, and that **strips
  the table role** in Chrome and Safari. The `scope` on every heading would stop
  meaning anything on phones — the devices most members read this app on.
- CSS-generated text is not reliably in the accessibility tree. It cannot be a
  heading and cannot be tied to its value.
- It allows exactly one design: every cell becomes `Label: value`, same order,
  same weight. No promoting the team name to a card title.
- `VirtualizedList` cannot window `<tr>`s inside a real `<table>`, and inside
  `display:none` it measures to zero height.

Rendering both trees and hiding one with `md:hidden` / `hidden md:block` is
correct for accessibility (`display:none` keeps the hidden copy out of the
tree) but builds both every render. `useIsMobile()` builds one, and keeps the
breakpoint in a single place — it is 768px, exactly Tailwind's `md`.

## Exceptions — tables that deliberately do not use it

Do not bend the API to fit these. If you find a sixth pattern, add it here.

| Where                                                             | Why                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/divisions/DivisionsTab.tsx`                                | Its rows share inline-edit state across their cells (one Edit button turns three cells into inputs). A `cell: (row) => ReactNode` function cannot hold that state. Keeps the two-tree pattern with `DivisionRow layout="row" \| "card"`. |
| `admin/power-migration/ComparisonTable.tsx`                       | Two header rows, plus an expandable nested detail table.                                                                                                                                                                                 |
| `stats/CompactStandings.tsx`                                      | Its phone view is a `VirtualizedList` of cards, which cannot live inside a `<table>`.                                                                                                                                                    |
| `stats/HeadToHeadRecords.tsx`                                     | Its phone card is colour-coded down the left edge by rivalry type and packs name, badge, W-L, win%, games and last-played into three dense rows. Its desktop side does use the shared `Table` and `SortableColumnHeader`.                |
| `timeslots/TimeslotList.tsx`                                      | Three short columns (Time, Team, Actions). It already reads fine on a phone, so a card per row would be more chrome for less information.                                                                                                |
| `admin/blind-draw/*`                                              | Three visible columns on a phone — the date folds under the name — so a card per signup would be more chrome for less information. The list and its skeleton share a `SignupsTable` frame instead, so their headings cannot drift apart. |
| `stats/RankingsTable.tsx`, `stats/career/CareerRankingsTable.tsx` | Their phone views are **richer** than their tables, not duplicates of them — a leaderboard carousel, team badges, a Compact/Detailed toggle and a reduced sort set. A generic card mode would delete all of it.                          |

## Related

- `src/docs/CARD_PATTERNS.md` — the `Card` hierarchy the card mode is built on
- `src/components/stats/SortableColumnHeader.tsx` — a keyboard-sortable heading
  with `aria-sort` (bug B-34). Use it rather than making a `<th>` clickable.
- L3 in `docs/audits/UX-AUDIT-2026-09.md` — why this exists
