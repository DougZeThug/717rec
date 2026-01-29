

# Plan: Export Matchups Page to Excel

## Overview
Add an "Export to Excel" button to the Matchups tab (`OpponentHistoryTab`) in the Admin panel that generates a clean, organized Excel spreadsheet (.xlsx) with opponent history data.

## Current State

**Matchups Tab Location:** `src/components/admin/opponent-history/OpponentHistoryTab.tsx`

**Data Source:** `useSeasonOpponentHistory()` hook returns:
```typescript
interface SeasonOpponentData {
  seasonId: string;
  seasonName: string;
  teams: TeamOpponentHistory[];  // Each team with their opponents
}

interface TeamOpponentHistory {
  teamId: string;
  teamName: string;
  divisionName: string | null;
  opponents: OpponentRecord[];
  uniqueOpponentCount: number;
  totalMatches: number;
}

interface OpponentRecord {
  opponentName: string;
  matchCount: number;
  wins: number;
  losses: number;
}
```

**Current Export Utilities:** `src/utils/exportUtils.ts` has CSV export functions but no Excel support.

## Solution

### Approach: Use SheetJS (xlsx) Library

SheetJS is the de-facto standard for Excel file generation in JavaScript. It's lightweight (~100KB minified) and has no dependencies.

**Why xlsx over CSV:**
- Proper Excel formatting (column widths, headers, multiple sheets)
- Better organization for complex data
- Native Excel file that opens without import dialogs
- Supports styling (bold headers, frozen rows)

### Export Format Design

The Excel file will have **two sheets** for maximum usability:

**Sheet 1: "Team Summary"** - One row per team
| Team | Division | # Opponents | # Matches |
|------|----------|-------------|-----------|
| Team A | Tier 1 | 6 | 8 |
| Team B | Tier 2 | 5 | 7 |

**Sheet 2: "Matchup Details"** - One row per team-opponent pair
| Team | Division | Opponent | Opponent Div | Matches | Wins | Losses | Record |
|------|----------|----------|--------------|---------|------|--------|--------|
| Team A | Tier 1 | Team B | Tier 2 | 2 | 1 | 1 | 1-1 |
| Team A | Tier 1 | Team C | Tier 1 | 1 | 0 | 1 | 0-1 |

This format allows admins to:
1. Quickly see which teams have played the most/fewest opponents (Sheet 1)
2. Filter/sort by any column in Excel to find specific matchups (Sheet 2)
3. Use Excel's built-in functions for analysis

## Implementation

### 1. Install SheetJS Library

Add `xlsx` package to dependencies.

### 2. Create Export Utility
**New file:** `src/utils/exportMatchupsToExcel.ts`

```typescript
import * as XLSX from 'xlsx';
import { SeasonOpponentData } from '@/hooks/useSeasonOpponentHistory';

export const exportMatchupsToExcel = (data: SeasonOpponentData): void => {
  const workbook = XLSX.utils.book_new();
  
  // Sheet 1: Team Summary
  const summaryData = data.teams.map(team => ({
    'Team': team.teamName,
    'Division': team.divisionName || '—',
    '# Opponents': team.uniqueOpponentCount,
    '# Matches': team.totalMatches,
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  
  // Set column widths
  summarySheet['!cols'] = [
    { wch: 25 },  // Team
    { wch: 15 },  // Division
    { wch: 12 },  // # Opponents
    { wch: 12 },  // # Matches
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Team Summary');
  
  // Sheet 2: Matchup Details
  const detailsData: Array<Record<string, string | number>> = [];
  data.teams.forEach(team => {
    team.opponents.forEach(opp => {
      detailsData.push({
        'Team': team.teamName,
        'Division': team.divisionName || '—',
        'Opponent': opp.opponentName,
        'Opp. Division': opp.opponentDivision || '—',
        'Matches': opp.matchCount,
        'Wins': opp.wins,
        'Losses': opp.losses,
        'Record': `${opp.wins}-${opp.losses}`,
      });
    });
  });
  const detailsSheet = XLSX.utils.json_to_sheet(detailsData);
  
  detailsSheet['!cols'] = [
    { wch: 25 },  // Team
    { wch: 15 },  // Division
    { wch: 25 },  // Opponent
    { wch: 15 },  // Opp. Division
    { wch: 10 },  // Matches
    { wch: 8 },   // Wins
    { wch: 8 },   // Losses
    { wch: 10 },  // Record
  ];
  XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Matchup Details');
  
  // Generate filename with season name and date
  const date = new Date().toISOString().split('T')[0];
  const safeName = data.seasonName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${safeName}_Matchups_${date}.xlsx`;
  
  // Trigger download
  XLSX.writeFile(workbook, filename);
};
```

### 3. Update OpponentHistoryTab UI
**File:** `src/components/admin/opponent-history/OpponentHistoryTab.tsx`

Add an export button next to the filters:

```tsx
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportMatchupsToExcel } from '@/utils/exportMatchupsToExcel';

// In the component, after the filters section:
<Button
  variant="outline"
  size="sm"
  onClick={() => data && exportMatchupsToExcel(data)}
  disabled={!data}
>
  <Download className="h-4 w-4 mr-2" />
  Export to Excel
</Button>
```

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `xlsx` dependency |
| `src/utils/exportMatchupsToExcel.ts` | **New** - Excel export function |
| `src/components/admin/opponent-history/OpponentHistoryTab.tsx` | Add export button |

**Total: 3 files (1 new, 2 modified)**

## Technical Notes

1. **Library Size:** SheetJS is ~100KB minified, which is acceptable for an admin-only feature
2. **No Server Required:** File generation happens entirely client-side
3. **Browser Compatibility:** Works in all modern browsers via Blob API
4. **Filtered Export Option:** Could optionally export only the currently filtered teams (future enhancement)

## Example Output

When the admin clicks "Export to Excel", they'll get a file named like:
`Fall_2024_Matchups_2026-01-29.xlsx`

Opening it in Excel shows:

**Tab 1: "Team Summary"**
```text
+------------------+----------+-------------+----------+
| Team             | Division | # Opponents | # Matches|
+------------------+----------+-------------+----------+
| Bags & Brews     | Tier 1   | 6           | 8        |
| Corn Stars       | Tier 1   | 5           | 7        |
| ...              |          |             |          |
+------------------+----------+-------------+----------+
```

**Tab 2: "Matchup Details"**
```text
+------------------+----------+-----------------+---------------+---------+------+--------+--------+
| Team             | Division | Opponent        | Opp. Division | Matches | Wins | Losses | Record |
+------------------+----------+-----------------+---------------+---------+------+--------+--------+
| Bags & Brews     | Tier 1   | Corn Stars      | Tier 1        | 2       | 1    | 1      | 1-1    |
| Bags & Brews     | Tier 1   | Hole Patrol     | Tier 2        | 1       | 1    | 0      | 1-0    |
| ...              |          |                 |               |         |      |        |        |
+------------------+----------+-----------------+---------------+---------+------+--------+--------+
```

