# Contributing Guide

This guide documents the conventions and patterns used in this codebase to ensure consistency across contributions.

## Definition of Done

Before marking any feature or bugfix as complete, ensure it meets the criteria in [Definition of Done](./src/docs/DEFINITION_OF_DONE.md).

**Quick checklist:**
- [ ] Builds without errors (`npm run build`)
- [ ] Tests pass (`npm run test`)
- [ ] Loading/empty/error states handled
- [ ] Accessible via keyboard
- [ ] Follows pattern documentation

## Project Structure

```
src/
  components/     # React components organized by feature
  hooks/          # Custom React hooks organized by feature
  services/       # Business logic and API abstraction
  utils/          # Pure utility functions
  types/          # TypeScript type definitions
  contexts/       # React contexts
  pages/          # Route-level page components
  styles/         # CSS and design system
  config/         # App configuration
  constants/      # Constant values
  docs/           # Internal documentation
  integrations/   # Third-party integrations (Supabase, etc.)
  lib/            # Shared library code
```

## Naming Conventions

### Folders

| Type | Convention | Example |
|------|------------|---------|
| Feature folders | kebab-case, plural | `components/teams/`, `hooks/matches/` |
| Utility folders | kebab-case | `utils/power-score/` |
| Hook folders | kebab-case (no "use" prefix) | `hooks/auto-schedule/` |

### Files

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TeamCard.tsx`, `MessageBoard.tsx` |
| Hooks | camelCase with `use` prefix | `useTeams.ts`, `useAuth.ts` |
| Utils | camelCase | `dateUtils.ts`, `validation.ts` |
| Types | camelCase | `match.ts`, `team.ts` |
| Services | PascalCase with `Service` suffix | `TeamService.ts`, `RankingsService.ts` |
| Constants | camelCase for files | `divisionColors.ts` |

### Constants Values

Use `SCREAMING_SNAKE_CASE` for constant values:

```typescript
// ✅ Good
export const MAX_TEAM_SIZE = 4;
export const DEFAULT_ROUND_NUMBER = 1;

// ❌ Avoid
export const maxTeamSize = 4;
```

## Feature Organization

When adding a new feature (e.g., "notifications"):

1. **Components**: `src/components/notifications/`
   - Create feature-specific components
   - Add `index.ts` barrel export

2. **Hooks**: `src/hooks/notifications/`
   - Create feature-specific hooks
   - Add `index.ts` barrel export

3. **Types**: `src/types/notifications.ts`
   - Define TypeScript interfaces and types

4. **Utils** (if needed): `src/utils/notifications/`
   - Pure utility functions for the feature

5. **Services** (if needed): `src/services/notifications/`
   - Business logic and API calls

### Example Structure

```
src/
  components/
    notifications/
      NotificationCard.tsx
      NotificationList.tsx
      NotificationBadge.tsx
      index.ts
  hooks/
    notifications/
      useNotifications.ts
      useNotificationMutations.ts
      index.ts
  types/
    notifications.ts
  services/
    notifications/
      NotificationService.ts
      index.ts
```

## Barrel Exports

Each feature folder should have an `index.ts` that exports public interfaces:

```typescript
// components/notifications/index.ts
export { NotificationCard } from './NotificationCard';
export { NotificationList } from './NotificationList';
export { NotificationBadge } from './NotificationBadge';
```

### Guidelines

- Use **named exports** (avoid default exports for barrel files)
- Only export public components/hooks
- Keep internal implementation files private (don't export)

### Importing

```typescript
// ✅ Good - import from barrel
import { NotificationCard, NotificationList } from '@/components/notifications';

// ✅ Also acceptable - direct import for specific files
import { NotificationCard } from '@/components/notifications/NotificationCard';

// ❌ Avoid - importing internal implementation details
import { internalHelper } from '@/components/notifications/utils';
```

## Component Guidelines

### File Structure

```typescript
// 1. Imports
import React from 'react';
import { cn } from '@/lib/utils';

// 2. Types/Interfaces
interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

// 3. Component
export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  // hooks first
  const [state, setState] = useState();
  
  // derived values
  const computedValue = useMemo(() => {}, []);
  
  // handlers
  const handleClick = () => {};
  
  // render
  return <div>{title}</div>;
};
```

### Styling

- Use Tailwind CSS with semantic tokens from the design system
- **Never use direct colors** - always use CSS variables (`text-foreground`, `bg-background`, etc.)
- All colors must be HSL format in the design system

```typescript
// ✅ Good - using semantic tokens
<div className="bg-background text-foreground border-border">

// ❌ Avoid - direct colors
<div className="bg-white text-black border-gray-200">
```

## Hook Guidelines

### Naming

- Always prefix with `use`: `useTeams`, `useMatchData`
- Be descriptive: `useTeamMutations` not `useTeamMut`

### Structure

```typescript
// useMyFeature.ts
import { useQuery } from '@tanstack/react-query';

export const useMyFeature = (id: string) => {
  return useQuery({
    queryKey: ['my-feature', id],
    queryFn: () => fetchMyFeature(id),
  });
};
```

## Code Style

### TypeScript

- Use explicit return types for public functions
- Prefer interfaces over types for object shapes
- Use `type` for unions, intersections, and aliases

### React

- Prefer functional components with hooks
- Use `React.FC<Props>` for component typing
- Destructure props in function signature

## Related Documentation

- [Definition of Done](./src/docs/DEFINITION_OF_DONE.md)
- [Card Patterns](./src/docs/CARD_PATTERNS.md)
- [Form Patterns](./src/docs/FORM_PATTERNS.md)
- [Modal Patterns](./src/docs/MODAL_PATTERNS.md)
- [Folder Conventions](./src/docs/FOLDER_CONVENTIONS.md)

## Questions?

If you're unsure about a pattern, look for similar existing code in the codebase and follow that pattern, or ask the team.
