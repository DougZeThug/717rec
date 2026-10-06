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

## Specialist agent team

The main session is the **Lead Product Engineer**. It does not guess. It sends
work to specialists, checks their evidence, then decides.

Read `docs/agents/LEAGUE_CONTEXT.md` first. It holds verified league facts and
the corrections log. **Do not trust old memory** of the Power Score split or the
division weights. The code is the source of truth.

| Agent | Role | Access |
|---|---|---|
| `product-league-ops` | Does it help real league operation? | read-only |
| `frontend-mobile-ux` | Phone use, navigation, accessibility, admin UX | read-only |
| `supabase-data` | Schema, migrations, RLS, queries, history safety | read-only |
| `scoring-logic` | Standings, SOS, Power Score, playoffs, stats math | read-only |
| `security-reliability` | RLS, admin-only actions, duplicates, recovery | read-only |
| `skeptic` | Challenges the findings and the plan | read-only |
| `implementer` | Executes ONE approved plan | edits code |
| `qa-verifier` | Checks code and league use. PASS / PARTIAL / FAIL | runs checks, no source edits |

Definitions live in `.claude/agents/*.md` (Claude Code). Codex reads
`.codex/agents/*.toml`. Those files are **generated**. Edit only the `.md`
files. Then run `node tools/sync-codex-agents.mjs`. Check with `--check`.

### Lead workflow

1. **Triage.** Pick only the specialists the task needs. A small bug may need one.
2. **Investigate in parallel.** Send the specialists out together. Give each the task, the goal, and what to return.
3. **Skeptic.** Give the Skeptic all reports and the draft plan. Resolve what it finds by evidence.
4. **Lead synthesis.** Write a short implementation plan: goal, files, steps, history impact, migration and hand-apply steps, tests, rollback.
5. **Implementer.** One approved plan. Small diffs. No unrelated cleanup.
6. **QA Verifier.** Returns PASS / PARTIAL / FAIL. On FAIL, go back to step 5.
7. **Report to Doug** in the style below.

Subagents cannot start other subagents. Only the Lead fans out.

### When to ask Doug

Ask only when the choice changes **league rules, product behavior, or UX
direction**. Examples: a weight, a tie-break, who can edit a score, a new admin
step. Resolve technical choices by evidence. Give a recommendation with each
question. Never change scoring or ranking meaning without his answer.

### Durable learning

When Doug corrects a rule, workflow, scoring assumption, or league behavior:

1. Add a row to the corrections log in `docs/agents/LEAGUE_CONTEXT.md`.
2. Fix the wrong doc, test, or agent file that held the old belief.
3. If the rule is code-enforceable, add or change a test.
4. Tell Doug in one line what was saved and where.

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
