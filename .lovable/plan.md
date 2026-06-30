Plan: remove the last explicit `any` cast in the codebase.

Location
- `src/services/brackets/manager/services/__tests__/BracketStandingsService.test.ts` line 55 currently casts both `storage` and `manager` with `as any` and suppresses the rule with `// eslint-disable-next-line @typescript-eslint/no-explicit-any`.

Why this matters
- The project enforces `@typescript-eslint/no-explicit-any` and currently reports 1 remaining violation. Replacing it with typed `unknown` casts keeps the test passing while removing the final `any` from the code-health tally.

Steps
1. Add type imports:
   - `import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';`
   - `import type { BracketsManager } from 'brackets-manager';`
2. In the `makeService` helper, replace the single line:
   - `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
   - `return new BracketStandingsService(storage as any, manager as any);`
   with:
   - `return new BracketStandingsService(storage as unknown as SupabaseSqlStorage, manager as unknown as BracketsManager);`
3. Run the targeted test: `npm run test:file -- src/services/brackets/manager/services/__tests__/BracketStandingsService.test.ts`
4. Run `npx eslint .` to confirm the remaining `any` count drops to 0.

Verification
- Test file should pass unchanged behavior.
- `npx eslint .` should report zero `@typescript-eslint/no-explicit-any` violations.

No other files need to change; this is a single-test cleanup.