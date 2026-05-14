## Plan: Accept dev-dependencies Dependabot bump

Three patch/minor dev-only updates with no breaking changes:

- `@types/node` 25.6.0 → 25.6.2 (type defs only)
- `eslint` 10.2.0 → 10.3.0 (minor, no rule removals affecting us)
- `typescript-eslint` 8.59.1 → 8.59.2 (patch)

### Steps

1. Run `npm install --legacy-peer-deps` with the three updated versions to refresh `package.json` + `package-lock.json`.
2. Verify with `npx tsc --noEmit` and `npx eslint .` (or at least lint a few files) to confirm no new type/lint errors.
3. No source code changes expected — these are dev-only tooling bumps.

### Risk

Very low. All within same major; dev-only (no runtime/bundle impact).
