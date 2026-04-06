

## Fix: Replace `any` types with `Season` in admin season components

### What's wrong

Four season-related admin components use `any` for their season props/state instead of the existing `Season` type from `src/types/season.ts`.

### Changes

All four files get the same treatment: import `Season` and replace `any`.

| File | Line | Current | Change to |
|------|------|---------|-----------|
| `SeasonActions.tsx` | 11 | `season: any` | `season: Season` |
| `SeasonActivationDialog.tsx` | 22 | `season: any` | `season: Season` |
| `SeasonArchivalDialog.tsx` | 21 | `season: any` | `season: Season` |
| `SeasonManagementTab.tsx` | 16 | `useState<any>(null)` | `useState<Season \| null>(null)` |
| `SeasonManagementTab.tsx` | 31 | `(season: any)` | `(season: Season)` |

Each file adds: `import { Season } from '@/types/season';`

### Scope

4 files, import + type annotation changes only. No logic changes.

