

## Bump Dev Dependencies

### What we're doing

Updating 6 dev dependencies to their latest versions. All are minor/patch bumps except ESLint (9→10) and TypeScript (5→6), which are major but already listed with `^` prefixes in package.json matching the target versions.

### Updates

| Package | From | To | Risk |
|---------|------|----|------|
| `@types/node` | 25.2.3 | 25.5.0 | Minor — type additions only |
| `eslint` | 9.39.3 | 10.1.0 | **Major** — ESLint 10 drops Node 18, removes deprecated APIs. Project already uses flat config so no migration needed. `typescript-eslint` 8.57.2 supports ESLint 10. |
| `eslint-plugin-react-refresh` | 0.5.0 | 0.5.2 | Patch — bug fixes |
| `typescript` | 5.9.3 | 6.0.2 | **Major** — TS 6 isolatedDeclarations default change, but this project doesn't emit declarations. No breaking impact expected. |
| `typescript-eslint` | 8.56.0 | 8.57.2 | Minor — adds ESLint 10 compat |
| `vitest` | 4.0.18 | 4.1.2 | Minor — new features, bug fixes |

### Compatibility note

`@vitest/coverage-v8` is currently at `^4.0.18`. vitest 4.1.2 is compatible — the coverage plugin will resolve to a matching minor. We should bump it alongside to `^4.1.2` for consistency.

`eslint-plugin-vitest` at `^0.5.4` should work with ESLint 10 — the flat config API hasn't changed for plugins.

### Steps

1. Update all 6 versions in `package.json` + bump `@vitest/coverage-v8` to `^4.1.2`
2. Run `npm install --legacy-peer-deps` to sync lockfiles
3. Run `npm run build` to verify no compile errors
4. Run `npm run lint` to verify ESLint 10 works with existing config
5. Run `npm run test` to verify all tests pass

### Scope

`package.json` + lockfile updates only. No code changes expected.

