

## Update Dev Dependencies

Bump three dev dependencies in `package.json`:

1. `@types/node`: `^25.2.0` to `^25.2.3`
2. `typescript-eslint`: `^8.54.0` to `^8.55.0`
3. `eslint`: `^9.39.2` to `^10.0.0`

All are minor/patch updates except ESLint which is a major bump (9 to 10). Since `@eslint/js` was already updated to `^10.0.1` in the previous batch, this aligns the core `eslint` package to match.

### Changes

**File: `package.json`** -- Update three version strings in `devDependencies`:
- Line 98: `@types/node` from `^25.2.0` to `^25.2.3`
- Line 103: `eslint` from `^9.39.2` to `^10.0.0`
- Line 117: `typescript-eslint` from `^8.54.0` to `^8.55.0`

