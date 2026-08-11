# Agent Instructions (Codex, Claude Code, etc.)

This repo uses **npm**. It does **not** use pnpm, yarn, or bun.

## Communication style

- **Always talk in ASD-STE100 Simplified Technical English** — short sentences,
  simple approved words, active voice, one instruction per sentence.
- **Always talk to me like I have ADHD** — give the answer first, keep it short,
  use bullets, make the key point bold, no walls of text.

## Package manager

- Use `npm install` / `npm ci`.
- Never use `pnpm`, `yarn`, or `bun` — they are not installed and the lockfiles aren't compatible.

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

## Typechecking

The root `tsconfig.json` has `"files": []` and delegates to
`tsconfig.app.json` / `tsconfig.node.json` via project references. A bare
`tsc --noEmit` compiles an empty file list and exits 0 **even when types are
broken** — it is silently useless, not a clean pass.

```bash
# The real check
npm run typecheck

# Ignore stale build info
npm run typecheck:full
```

## Coverage

See `TESTING.md`. Default fast gate is `npm run test:coverage`; serial fallback is `npm run test:coverage:serial`. For diagnosing a slow or stuck non-coverage run, use `npm run test:debug` (serial + verbose, 10-min cap).

## More project conventions

See `CLAUDE.md` for architecture rules, error handling, and testing patterns.