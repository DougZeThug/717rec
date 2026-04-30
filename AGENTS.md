# Agent Instructions (Codex, Claude Code, etc.)

This repo uses **npm** (with `bun` as a faster optional installer). It does **not** use pnpm or yarn.

## Package manager

- Use `npm install` / `npm ci` (or `bun install`).
- Never use `pnpm` or `yarn` — they are not installed and the lockfiles aren't compatible.

## Running tests

The `vitest` binary lives at `node_modules/.bin/vitest`. Many sandboxed agent
shells do **not** have `node_modules/.bin` on `PATH`, so a bare `vitest ...`
call will fail with `sh: 1: vitest: not found`. Use one of these instead:

```bash
# Full suite
npm test

# Single file (recommended — npm injects node_modules/.bin into PATH)
npm run test:file -- src/path/to/File.test.tsx

# Or use npx, which resolves the local binary automatically
npx vitest run src/path/to/File.test.tsx

# Last resort: call the binary directly
./node_modules/.bin/vitest run src/path/to/File.test.tsx
```

## Coverage

See `TESTING.md`. Default fast gate is `npm run test:coverage`; serial
fallback is `npm run test:coverage:serial`.

## More project conventions

See `CLAUDE.md` for architecture rules, error handling, and testing patterns.