# Folder Conventions

Quick reference for folder and file naming conventions in this project.

## Quick Reference

| Type | Convention | Example |
|------|------------|---------|
| Feature folders | kebab-case, plural | `components/teams/` |
| Utility folders | kebab-case | `utils/power-score/` |
| Hook folders | kebab-case (no "use" prefix) | `hooks/auto-schedule/` |
| Component files | PascalCase | `TeamCard.tsx` |
| Hook files | camelCase + use | `useTeams.ts` |
| Service files | PascalCase + Service | `TeamService.ts` |
| Type files | camelCase | `match.ts` |
| Util files | camelCase | `dateUtils.ts` |

## New Feature Checklist

When adding a new feature (e.g., "notifications"):

- [ ] `src/components/notifications/` - UI components
- [ ] `src/components/notifications/index.ts` - Barrel export
- [ ] `src/hooks/notifications/` - Feature hooks
- [ ] `src/hooks/notifications/index.ts` - Barrel export
- [ ] `src/types/notifications.ts` - Type definitions
- [ ] `src/utils/notifications/` (if needed) - Utility functions
- [ ] `src/services/notifications/` (if needed) - Business logic

## Barrel Export Template

```typescript
// index.ts
export { ComponentA } from './ComponentA';
export { ComponentB } from './ComponentB';
export { useFeatureHook } from './useFeatureHook';
export type { FeatureType } from './types';
```

## Current Structure Examples

### Good Patterns to Follow

```
components/
  badges/              # ✅ kebab-case, plural
    BadgeCard.tsx      # ✅ PascalCase
    BadgeGrid.tsx
    index.ts           # ✅ barrel export

hooks/
  message-board/       # ✅ kebab-case, no "use" prefix
    useMessageBoard.ts # ✅ camelCase with use prefix
    useMessageMutations.ts
    index.ts

services/
  brackets/            # ✅ kebab-case, plural
    BracketService.ts  # ✅ PascalCase + Service
    bracket-creator.ts

utils/
  validation/          # ✅ kebab-case
    matchValidation.ts # ✅ camelCase
```

### Patterns to Avoid (Legacy)

These exist in the codebase but should not be replicated:

```
hooks/
  useAutoSchedule/     # ❌ has "use" prefix - should be auto-schedule/
  
utils/
  teamStatsUtils/      # ❌ camelCase folder - should be team-stats/
```

## File Placement Rules

### Where does it go?

| If it's... | Put it in... |
|------------|--------------|
| A React component | `components/{feature}/` |
| A custom hook | `hooks/{feature}/` or `hooks/` (if generic) |
| Type definitions | `types/{feature}.ts` |
| Pure utility functions | `utils/{feature}/` |
| API/business logic | `services/{feature}/` |
| React context | `contexts/` |
| Page component | `pages/` |
| App configuration | `config/` |
| Constant values | `constants/` |

### Generic vs Feature-Specific

**Generic** (stays at folder root):
- `hooks/use-mobile.ts` - used everywhere
- `hooks/use-toast.ts` - used everywhere
- `utils/cn.ts` - general utility

**Feature-specific** (goes in subfolder):
- `hooks/teams/useTeams.ts` - team-specific
- `utils/power-score/calculations.ts` - power score specific

## Migration Notes

When refactoring existing code to match conventions:

1. **Create the new folder structure first**
2. **Move files one at a time**
3. **Update imports using search/replace**
4. **Test thoroughly before committing**
5. **Update barrel exports**

Priority for migration (when time permits):
1. Hook folders with "use" prefix → kebab-case
2. Util folders with camelCase → kebab-case
3. Root-level hooks → feature subfolders

## Related Docs

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Full contribution guide
- [CARD_PATTERNS.md](./CARD_PATTERNS.md) - Card component patterns
- [FORM_PATTERNS.md](./FORM_PATTERNS.md) - Form component patterns
- [MODAL_PATTERNS.md](./MODAL_PATTERNS.md) - Modal component patterns
