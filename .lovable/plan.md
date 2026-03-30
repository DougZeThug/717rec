

## Fix: Case-Insensitive Division Name Validation

### Problem
Division duplicate checks use case-sensitive comparison (`Array.includes()` / `===`), allowing "Competitive" and "competitive" to coexist as separate divisions.

### Changes

**3 files, ~6 lines each:**

**1. `src/components/history/editing/AddDivisionButton.tsx`** (line ~39)
Replace `existingDivisions.includes(trimmedName)` with:
```typescript
existingDivisions.some(d => d.toLowerCase() === trimmedName.toLowerCase())
```

**2. `src/components/history/editing/EditableDivisionHeader.tsx`** (line ~50)
Replace `existingDivisions.includes(trimmedValue)` with:
```typescript
existingDivisions.some(d => d.toLowerCase() === trimmedValue.toLowerCase())
```

**3. `src/components/history/hooks/useHistoryEditing.ts`**
- `addDivision` (line 261): replace `prev.includes(name)` with `prev.some(d => d.toLowerCase() === name.toLowerCase())`
- `renameDivision` (line 268): replace `oldName === newName` with case-insensitive check
- `getTeamsByDivision` (line 135): replace `t.division_name === divisionName` with case-insensitive compare
- `removeDivision` (line 288): replace `t.division_name === name` with case-insensitive compare
- `reorderTeamInDivision` (line 225 & 247): replace `t.division_name === divisionName` with case-insensitive compare
- `moveTeam` (lines 163, 191, 206, 210): replace `=== toDivision` / `=== fromDivision` with case-insensitive compare

To keep it DRY, add a small helper at the top of the file:
```typescript
const divisionsMatch = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase();
```

Then use `divisionsMatch(t.division_name, divisionName)` everywhere instead of `===`.

