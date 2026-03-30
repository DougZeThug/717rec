

## Dev Dependency Bump: 6 Packages

### Risk Assessment

| Package | From → To | Type | Risk | Notes |
|---------|-----------|------|------|-------|
| `@types/node` | ^25.2.3 → ^25.5.0 | Minor | Minimal | Type definitions only |
| `eslint` | ^9.39.3 → ^10.1.0 | **Major** | **Medium** | Drops legacy `.eslintrc` (already using flat config), requires Node ≥20.19 |
| `eslint-plugin-react-refresh` | ^0.5.0 → ^0.5.2 | Patch | Minimal | |
| `typescript` | ^5.9.3 → ^6.0.2 | **Major** | **Medium** | Transition release toward TS 7.0; changes some defaults |
| `typescript-eslint` | ^8.56.0 → ^8.57.2 | Minor | Low | |
| `vitest` | ^4.0.18 → ^4.1.2 | Minor | Low | |

### Key Risks & Mitigations

**ESLint 9 → 10**: The project already uses flat config (`eslint.config.js`) so the main breaking change (legacy config removal) doesn't apply. Need to verify all plugins are ESLint 10-compatible — `@eslint/js` is already `^10.0.1` so that's fine. The `eslint-plugin-vitest` at `^0.5.4` and other plugins should work.

**TypeScript 5.9 → 6.0**: TS 6.0 is a "transition release." Key concern: it changes some `tsconfig` defaults. However, the project already explicitly sets `"types": ["node"]`, `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, and `"strict": false` — so new defaults won't silently change behavior. The `"DOM.Iterable"` lib entry becomes a no-op (merged into `"DOM"`) but still works. May need to add `"ignoreDeprecations": "6.0"` to tsconfig if any deprecated options trigger warnings, but with this config it's unlikely.

### Plan

1. **Update `package.json`** — bump all 6 dev dependency version ranges
2. **Run `tsc --noEmit`** — verify no type regressions from TS 6.0
3. **Run `eslint .`** — verify ESLint 10 works with existing flat config and plugins
4. **If TS 6.0 emits deprecation warnings** — add `"ignoreDeprecations": "6.0"` to `tsconfig.app.json` and `tsconfig.node.json`

### Files
- **Edit**: `package.json` (6 version bumps in `devDependencies`)
- **Possibly edit**: `tsconfig.app.json`, `tsconfig.node.json` (only if deprecation warnings appear)

