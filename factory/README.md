# The software factory

Claude Code, set up as a small software team. You describe the goal. It plans, builds, tests, reviews, repairs and hands back a ready branch with evidence. **It never merges or deploys.**

## Start work

| Type this | What happens |
|---|---|
| `/factory-build Add a "forfeit" badge to the schedule` | Plan, build, test, review, deliver |
| `/factory-fix The playoff bracket shows the wrong seed after a score edit` | Reproduce, find cause, fix, regression test |
| `/factory-polish The standings page on my phone` | Before/after screenshots, small fixes only |
| `/factory-review 1730` | Independent review of a PR, no edits |
| `/factory-status` | What is open, failing, blocked, next |
| `/factory-maintain tests` | Audit, then repair branches |

## Parts

- **Playbook:** `factory/PIPELINE.md` (the Director's stages, gates, retry rules).
- **Agents** (`.claude/agents/factory-*.md`): architect, builder, ux, qa, repair, reviewer. Project specialists stay separate and are listed in `.factory/config.json`.
- **Task ledger:** `node factory/bin/factory.mjs` keeps task records in `.factory/tasks/`, metrics in `.factory/ledger.jsonl`. The **gate** refuses "ready" unless criteria are shown, checks pass **on the current commit**, no test was weakened, and an independent review approves that commit. One exception: `F waive <id> <check> "<reason>"` makes the gate skip that check, including `integrity`. **Only a human may approve a waiver.** An agent must never waive a check on its own; it reports the failing check instead.
- **Browser evidence:** `factory/bin/shoot.mjs` takes phone + desktop screenshots and reports console errors. Requests to a blocked host never reach production: GET, HEAD and OPTIONS get an empty local answer (`[]`), and every other method is aborted, so writes are dropped. Only hosts in `preview.blockedHosts` are covered.
- **Screenshot data safety:** the tool refuses to run with an empty `preview.blockedHosts`, answers requests to those hosts locally, blocks service workers, and also tells the browser not to resolve those hosts. The last layer stops redirect hops and WebSockets. It works when the browser resolves names itself. It is **not proven behind an HTTP proxy**, which resolves names on its own. On a proxied network, check the first run's `blockedRequests` list.
- **Safety layers:** (1) `.claude/settings.json` permission rules, (2) `factory/hooks/guard.mjs`, (3) GitHub branch protection. Layer 3 is yours to turn on (`docs/OPERATIONS.md` section 5). Hooks cannot stop every shell trick.
- **Project config:** `.factory/config.json` (checks, protected paths, limits, preview, specialists). The only file that differs per app.

## Verified vs. not yet verified

Run `node --test factory/spec/*.spec.mjs` to re-check the tools.

- **Verified by tests** (`factory/spec/`): the guard hook rules (pushes, resets, cleans, protected paths, `cd`, quoted substitutions, secret scan), the ledger gates (stale evidence, review, repair limit, no substitute check commands, integrity baseline), the installer (bad JSON, exact hook match, workflow and `.gitignore` handling, base branch detection), the Codex agent generator, and the `shoot` fail-closed checks plus the host blocklist.
- **Not verified:** the issue-label workflow (never run, needs the secret and the Claude GitHub App), scheduled audits (not created), `shoot` behind an HTTP proxy, GitHub branch protection (yours to turn on), and the permission rules in `.claude/settings.json` (only the hook is tested).

## Unattended runs (opt-in, off by default)

1. **Issue label:** `.github/workflows/factory-issue.yml`. Off until you set repo variable `FACTORY_ENABLED=true` and add secret `CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY`) and install the Claude GitHub App (`/install-github-app`). One run at a time. Cap: 80 turns, $10 per run. **Untested.**
2. **Scheduled audit / CI repair:** create a scheduled task at claude.ai/code/routines (research preview) with the prompt `Run /factory-maintain tests`. Not created. It uses plan usage on every run.
3. **Fix a failing PR:** `/autofix-pr` in a Claude Code cloud session (native).

## Install in another app

```bash
node factory/install.mjs /path/to/other-repo        # add --with-github for the issue workflow
```

It copies only the portable kit, creates `.factory/config.json` from the target's `package.json` scripts, and merges (never replaces) `.claude/settings.json`. Then edit the new config (protected paths, preview URL, boundaries), commit, and start a new Claude Code session there.
Per-app ideas: FloorForge -> protect approved artwork folders, add a screenshot-diff check. Nothing Strange Here -> add a scene-load and performance check.

## Limits to know

- New agents, skills and settings load when a session starts.
- Agent teams are experimental and are not used.
- Scheduled tasks are a research preview.

## Known limits

- The guard reads one shell command at a time. It cannot follow a `cd` from an earlier command, shell variables, scripts that delete files, or `git -C` / `git -c` tricks beyond the rules it has. Hooks are a backstop, not a sandbox. Branch protection on GitHub is the real wall.
- `git commit <paths>` (commit only some files, no `-a`) is not scanned for secrets. `git commit -a` and `git add ... && git commit` are.
- The `factory-reviewer` and `factory-qa` read-only rule is prompt text on the Claude side. The generated Codex copies set a sandbox (`read-only` for the reviewer, `workspace-write` for QA because it must run checks that write temp files and coverage).
- The issue workflow gives the agent write access. The only approval step is that a person with triage rights must add the `factory` label. Read the issue before you label it: its text is untrusted input.
- A reinstall adds a settings hook only when its exact command is missing. If you changed a hook command by hand, the old and new command can both stay.
- `queue: max` for the workflow concurrency group is not used: it is not a confirmed GitHub Actions key. Extra labels wait as GitHub's concurrency group allows (one running, one pending).
