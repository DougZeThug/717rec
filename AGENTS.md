# Agent Instructions (Codex, Claude Code, etc.)

Development and CI use **npm**. Never use pnpm or yarn.

**But the hosted deploy build runs `bun install --frozen-lockfile`**, against the
tracked `bun.lock`. So adding or removing a dependency means updating **both**
lockfiles, or the deploy fails with "lockfile had changes, but lockfile is
frozen" while every local check still passes:

```bash
npm install <pkg>          # updates package.json + package-lock.json
bun install --lockfile-only # updates bun.lock to match — do not skip this
```

Run every other command with npm.

## Communication style

- **Always talk in ASD-STE100 Simplified Technical English** — short sentences,
  simple approved words, active voice, one instruction per sentence.
- **Always talk to me like I have ADHD** — give the answer first, keep it short,
  use bullets, make the key point bold, no walls of text.

## Package manager

- Use `npm install` / `npm ci`.
- Never use `pnpm` or `yarn`.
- Never run a plain `bun install` — it would write `node_modules` from bun's
  resolution instead of npm's. `bun install --lockfile-only` only refreshes the
  lockfile, which is all the deploy needs.

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

### Two TypeScript installs

- `typescript` is pinned to **7.0.2** — the native compiler used by
  `npm run typecheck` and by the editor.
- `typescript-6` is an alias of **typescript@6.0.3**, used **only by ESLint**.
  typescript-eslint still needs the JavaScript compiler API, which TypeScript 7
  no longer ships.
- The `lint` / `lint:fix` scripts load `tools/lint-typescript-6.cjs` with
  `node --require`. That hook redirects `require('typescript')` inside the lint
  process to `typescript-6`. Always lint through `npm run lint`; a bare
  `npx eslint .` skips the hook and fails.
- Bump both versions together.

## Coverage

See `TESTING.md`. Default fast gate is `npm run test:coverage`; serial fallback is `npm run test:coverage:serial`. For diagnosing a slow or stuck non-coverage run, use `npm run test:debug` (serial + verbose, 10-min cap).

## More project conventions

See `CLAUDE.md` for architecture rules, error handling, and testing patterns.
