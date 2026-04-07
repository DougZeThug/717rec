

## Phase 0: Test Infrastructure Setup

### What we're doing

Setting up coverage tooling and a shared Supabase mock factory so future test phases are productive and consistent.

### Changes

**1. Install `@vitest/coverage-v8`**

Add `@vitest/coverage-v8` as a dev dependency. This provides V8-based code coverage without needing Istanbul.

**2. Add script to `package.json`**

Add one new script:
```json
"test:coverage": "vitest run --coverage"
```

**3. Update `vitest.config.ts` — add coverage block**

Add a `coverage` section inside the existing `test` block:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/integrations/supabase/types.ts',
    'src/components/ui/**',
    'src/**/*.test.{ts,tsx}',
    'src/**/*.spec.{ts,tsx}',
    'src/setupTests.ts',
  ],
},
```

**4. Create shared Supabase mock factory — `src/test/mocks/supabaseMock.ts`**

A chainable builder that eliminates the boilerplate repeated across 7+ service test files. Pattern:

```ts
// Usage in tests:
const mock = createSupabaseMock();
mock.from('teams').select().order().resolves({ data: rows, error: null });
// or
mock.from('teams').insert().select().single().resolves({ data: row, error: null });
```

The factory will:
- Expose a `mockFrom` vi.fn() that tests can assert against
- Support chaining: `.select()`, `.insert()`, `.update()`, `.delete()`, `.eq()`, `.in()`, `.order()`, `.single()`, `.match()`
- Terminal `.resolves({ data, error })` sets the final return value
- Provide a `reset()` method for `beforeEach`
- Export a ready-made `vi.mock` setup function so tests can do:
  ```ts
  import { createSupabaseMock } from '@/test/mocks/supabaseMock';
  const mock = createSupabaseMock();
  vi.mock('@/integrations/supabase/client', () => ({ supabase: mock.client }));
  ```

This mirrors the inline mock pattern from `TeamFetchService.test.ts` and `TeamCreateService.test.ts` but centralizes it.

**5. Run `npm run test:coverage` to establish baseline**

Execute once to capture the initial coverage numbers. No target threshold yet — just record the baseline.

### What stays the same

- Existing test files are not modified (they'll be migrated to the shared mock in a future phase)
- No production code changes
- `vite.config.ts` stays unchanged (only `vitest.config.ts` is updated)

### Scope

3 files changed/created, 1 dependency added. No logic or production code changes.

