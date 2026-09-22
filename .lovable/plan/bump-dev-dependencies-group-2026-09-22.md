# Bump dev-dependencies group

Update the 9 dev dependencies listed below to their target versions.

| Package | From | To |
|---|---|---|
| @testing-library/dom | ^10.4.1 | ^10.4.2 |
| @testing-library/react | ^16.3.2 | ^16.3.3 |
| @testing-library/user-event | ^14.6.4 | ^14.6.7 |
| @types/node | ^26.2.0 | ^26.6.1 |
| eslint | ^10.8.1 | ^10.10.0 |
| eslint-plugin-react-refresh | ^0.5.4 | ^0.5.7 |
| typescript | 6.0.3 | 7.0.2 |
| typescript-eslint | ^8.64.0 | ^8.70.0 |
| vitest | ^4.1.10 | ^5.0.1 |

## Steps

1. Edit `package.json` with the target versions. Keep `typescript` pinned (no caret) because it is currently exact.
2. Run `npm install` to update `package-lock.json`.
3. Run `bun install --lockfile-only` to sync `bun.lock`.
4. Run `npm run typecheck`.
5. Run `npm run lint`.
6. Run `npm run build`.
7. Run focused test gates:
   - Auth tests (`src/hooks/auth/__tests__`)
   - MCP tests (`src/lib/mcp` or similar)
   - Validation tests (`src/hooks/matches/validation/__tests__`, `src/services/brackets/validation/__tests__`)
8. Run the security dependency scan.
9. Report results and any follow-up needed.

## Risks

- **TypeScript 6.0.3 → 7.0.2** is a major version jump. Type-check may surface new strictness errors.
- **Vitest 4 → 5** is a major version jump. Some test config or API behavior may change; previous production bump already moved `@vitest/coverage-v8` to 5.0.1, so this pairs it with the matching test runner.
- These two bumps are the most likely to require small code or config fixes. If they fail, the plan will stop before claiming success.
