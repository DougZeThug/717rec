# 717rec

## Developer Preferences

- **I am NOT a coder** — always explain what you're doing in plain language, avoid jargon
- **Small, safe diffs** — one bug fix or one feature per commit, only change what's necessary
- **Explain your steps**: (1) tell me what you're about to do and why, (2) show the specific changes, (3) confirm what changed and how to verify
- Ask for confirmation before major changes
- When working on multi-step tasks: create a plan file, execute it, then delete the plan file when done

## Architecture Rules

- **Separation of concerns**: All Supabase calls go through `src/services/` — hooks and components must **never** import the Supabase client directly
  - Only exceptions: realtime `.channel()` subscriptions (stay in hooks) and `src/utils/imageUpload.ts` (Supabase Storage)
- New service functions must use `handleDatabaseError()` and `ensureFound()` from `@/utils/errorHandler`
- Services always **throw** errors — never return null/boolean for error states
- **Never use `select('*')`** in Supabase queries — always list columns explicitly
- Split service files into sub-services when they exceed ~400 lines (see `matches/` folder pattern)
- `src/integrations/supabase/types.ts` is **auto-generated** — never edit manually

## Service Template

```typescript
import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';

export const ExampleService = {
  fetchItems: async (seasonId: string) => {
    const { data, error } = await supabase
      .from('items')
      .select('id, name, season_id, created_at')
      .eq('season_id', seasonId);

    if (error) handleDatabaseError(error, 'Failed to fetch items');
    return data ?? [];
  },

  fetchItemById: async (id: string) => {
    const { data, error } = await supabase
      .from('items')
      .select('id, name, season_id, created_at')
      .eq('id', id)
      .single();

    if (error) handleDatabaseError(error, 'Failed to fetch item');
    return ensureFound(data, 'Item', id);
  },
};
```

## Codebase Rules

- Use `brackets-manager` library for playoff brackets — don't roll your own
- `.npmrc` has `legacy-peer-deps=true` — don't remove it
- Returning null is OK when it means "no data" (e.g., no match history). Returning null for errors is not OK — throw instead.

<important if="adding new features">

- Data flow: **Components → Hooks** (TanStack Query) **→ Services → Supabase**
- Error types: `src/types/errors.ts` (DatabaseError, NotFoundError, ValidationError, BusinessLogicError, AuthorizationError)
- Error utilities: `src/utils/errorHandler.ts`
- Admin permissions: use `useAdminAccess()` hook
- Most data is season-specific — always filter by season

</important>

<important if="working with tests">

- Mock Radix UI pointer capture methods in test setup — jsdom doesn't support them:
  ```typescript
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  });
  ```
- Also mock `scrollIntoView` if Radix components trigger it
- **Unit tests**: `__tests__/` folder next to the source file
- **Integration tests**: root `tests/` directory
- Rule of thumb: imports from one module → unit test. Touches multiple modules → integration test.

</important>

---

*Last updated: 2026-03-23*
