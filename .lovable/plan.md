
## What's actually going wrong

Those two warnings are **not bugs in your project or in the new test file**. They are environment problems inside Codex's sandbox:

1. `pnpm -s vitest run ...` — Codex tried `pnpm`, but this project doesn't use pnpm. Only `npm` and `bun` are installed (we use `bun.lock` + `package-lock.json`). So pnpm fails with a "toolchain path issue."

2. `npm run -s test -- src/components/.../MessageBoard.main-flow.test.tsx` — this fails with `sh: 1: vitest: not found` because Codex's shell did not have `node_modules/.bin` on its `PATH`. Vitest **is** installed correctly (`node_modules/.bin/vitest` exists, version 4.1.5), Codex just couldn't find it via a bare `vitest` call.

Also, the `--` argument forwarding works, but a cleaner pattern is to call the local binary directly so the agent doesn't depend on PATH.

The new test file itself (`MessageBoard.main-flow.test.tsx`) is fine as far as discovery goes — the include pattern in `vitest.config.ts` (`**/__tests__/**/*.test.tsx`) matches it.

## The fix: give Codex / Claude Code a known-good command pattern

We'll add a short "Running a single test file" section to `CLAUDE.md` (already read by Codex and Claude Code) plus a tiny `AGENTS.md` pointer, and add one new npm script that targets a single file safely. No source code changes.

### Plain-English summary of the changes

1. **Add `AGENTS.md`** at the repo root — Codex looks for this file by convention. It will say:
   - Use `npm`, never `pnpm` or `yarn`
   - Run vitest via `npx vitest run <path>` or `node_modules/.bin/vitest run <path>` (never bare `vitest`)
   - Use `npm test` for the full suite

2. **Update `CLAUDE.md`** — add a short "Running tests from an agent shell" subsection with the same three rules, plus the recommended one-file command:
   ```
   npx vitest run src/components/message-board/__tests__/MessageBoard.main-flow.test.tsx
   ```

3. **Add one npm script** to `package.json` for convenience:
   ```
   "test:file": "vitest run"
   ```
   so agents can run `npm run test:file -- <path>` and npm will resolve `vitest` from `node_modules/.bin` automatically — no PATH issue possible.

4. **Update `TESTING.md`** with a new "Troubleshooting agent shells" subsection covering the two exact errors you saw and the working commands.

### Technical details

- `npx vitest` works because `npx` resolves binaries from `./node_modules/.bin` first, which is why it succeeds even when `PATH` is missing that directory.
- `npm run <script>` also injects `./node_modules/.bin` into `PATH` for the duration of the script, which is why `npm run test:file -- <path>` will reliably work where bare `vitest` does not.
- We do not change `vitest.config.ts`, the test file, or any service code. Coverage scripts and CI workflows are untouched.

### Verification after approval

- Run `npx vitest run src/components/message-board/__tests__/MessageBoard.main-flow.test.tsx` from the sandbox to confirm it executes (proves the recommended command works).
- Run `npm run test:file -- src/components/message-board/__tests__/MessageBoard.main-flow.test.tsx` to confirm the new script also works.
- Confirm `AGENTS.md`, `CLAUDE.md`, and `TESTING.md` all contain matching guidance so whichever agent (Codex or Claude Code) reads first gets the same answer.

### Out of scope

- No changes to coverage thresholds, baseline, or the fast/serial coverage scripts from the prior work.
- No changes to the failing test file itself — it isn't actually failing on its own merits, it just couldn't be launched.
