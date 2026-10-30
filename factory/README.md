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
- **Task ledger:** `node factory/bin/factory.mjs` keeps task records in `.factory/tasks/`, metrics in `.factory/ledger.jsonl`. The **gate** refuses "ready" unless criteria are shown, checks pass **on the current commit**, no test was weakened, and an independent review approves that commit.
- **Browser evidence:** `factory/bin/shoot.mjs` takes phone + desktop screenshots and reports console errors. It answers every request to a blocked host (production) locally.
- **Safety layers:** (1) `.claude/settings.json` permission rules, (2) `factory/hooks/guard.mjs`, (3) GitHub branch protection. Layer 3 is yours to turn on (`docs/OPERATIONS.md` section 5). Hooks cannot stop every shell trick.
- **Project config:** `.factory/config.json` (checks, protected paths, limits, preview, specialists). The only file that differs per app.

## Verified vs. not yet verified

See the handoff report. Run `node --test factory/spec/*.spec.mjs` to re-check the tools (hooks, gates, retry limits).

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
