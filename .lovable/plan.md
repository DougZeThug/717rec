## Changes

Bump three non-major dev/prod deps in `package.json` and regenerate `bun.lock`:

- `react-intersection-observer`: `^10.0.3` → `^10.1.0`
- `recharts`: `^3.9.0` → `^3.9.2` (if not already applied)
- `prettier`: `3.9.4` → `3.9.5`

Then `rm -f bun.lockb bun.lock && bun install` to regenerate the lockfile so CI's `bun install --frozen-lockfile` passes.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run build`
- Confirm `bun install --frozen-lockfile` would succeed (dry run via fresh `bun install` producing a clean lockfile).