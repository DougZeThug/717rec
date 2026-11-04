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
- **Task ledger:** `node factory/bin/factory.mjs` keeps task records in `.factory/tasks/`, metrics in `.factory/ledger.jsonl`. The **gate** refuses "ready" unless criteria are shown, every required check passes **on the current commit** (that includes `integrity`, which looks for weakened tests), no repair issue is escalated, the tree is clean, and an independent code review approves that commit. A task marked `--trivial` skips **only** the need for that review: a recorded CHANGES or REJECT review still blocks it. Every other rule still applies. The Director sets it, only for a one-line doc or copy fix. The code does not check who sets it or what the change is. One exception: `F waive <id> <check> "<reason>"` makes the gate skip that check, including `integrity`. **Only a human may approve a waiver.** An agent must never waive a check on its own; it reports the failing check instead.
- **Browser evidence:** `factory/bin/shoot.mjs` takes phone + desktop screenshots and reports console errors. Requests to a blocked host never reach production: GET, HEAD and OPTIONS get an empty local answer (`[]`), and every other method is aborted, so writes are dropped. Only hosts in `preview.blockedHosts` are covered.
- **Screenshot data safety:** the tool refuses to run with an empty `preview.blockedHosts`, answers requests to those hosts locally, blocks service workers, and also tells the browser not to resolve those hosts. The last layer stops redirect hops and WebSockets. It works when the browser resolves names itself. It is **not proven behind an HTTP proxy**, which resolves names on its own. On a proxied network, check the first run's `blockedRequests` list.
- **Safety layers:** (1) `.claude/settings.json` permission rules, (2) `factory/hooks/guard.mjs`, (3) GitHub branch protection. Layer 3 is yours to turn on (`docs/OPERATIONS.md` section 5). Hooks cannot stop every shell trick.
- **Project config:** `.factory/config.json` (checks, protected paths, limits, preview, specialists). The only file that differs per app.

## Verified vs. not yet verified

Run `node --test factory/spec/*.spec.mjs` to re-check the tools. The same command is the `factory-specs` check in `.factory/config.json`. It is not in `verify.required`, so the gate does not need it.

- **Verified by tests** (`factory/spec/`):
  - The guard hook rules: pushes (split words, quotes, `+ref`, force flags, bulk flags), resets, cleans, protected paths, `cd` inside one command, quoted substitutions, escaped quotes, the secret scan.
  - The guard fails closed: bad input, a bad config, a failed git read, and the `|| exit 2` in the hook command.
  - Shell writes to the control files ask the human, and a block always wins over an ask.
  - The ledger gates: stale evidence, review, repair limit, integrity baseline. The CLI test checks both `GATE: READY` (exit 0) and `GATE: NOT READY` (exit 1). It also checks that every check refuses a `-- <cmd>` override (required, configured or unknown), and that a name like `constructor` ends with a plain error.
  - The text of the settings files (`settings.spec.mjs`): every verify check and the preview command match an allow rule, and no blanket `npm run` rule exists.
  - The installer: bad JSON, exact hook match, workflow and `.gitignore` handling, base branch detection. It also derives the allow rules from the target's own checks and keeps a rule the target already has.
  - The Codex agent generator, and the `shoot` fail-closed checks plus the host blocklist.
- **Not verified:** the issue-label workflow (never run, needs the secret and the Claude GitHub App), scheduled audits (not created), `shoot` behind an HTTP proxy, GitHub branch protection (yours to turn on), and the permission rules in `.claude/settings.json` as Claude Code runs them. The tests read that file as text. No test runs the rules inside Claude Code. Unknown: whether the hook's `ask` shows when nobody watches the session, and whether a later Claude Code version changes how an `ask` meets an allow rule.

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

- **The guard: what it covers and what it does not.** It reads each shell command as text. Hooks are a backstop, not a sandbox. Branch protection on GitHub is the real wall.
  - **Covered, blocked** (tested in `guard.spec.mjs`):
    - A push to a protected branch. This holds for a name split by a backslash-newline, quote marks anywhere in the name (single or double), a `+` ref, `HEAD`, `HEAD:<branch>`, `refs/heads/<branch>`, a short flag group that holds `f`, and the bulk flags (`--all`, `--mirror`, `--prune`). A plain force push is blocked too. A name that the shell builds is not covered: see Not covered.
    - `--no-verify` (and its short form), a hard reset, a forced clean, a change of the git hooks path.
    - A commit, merge or rebase while a protected branch is checked out. A fixed list of merge, deploy, publish and live-database commands.
    - A delete, move, restore or redirect into a protected path. This also holds after a `cd` in the same command, and inside quoted `$( )` and backtick substitutions.
    - A secret scan of the commit. It reads only the lines the commit adds.
  - **Covered, asks the human:** a shell write to a control file (the built-in list plus `controlPlanePaths` in `.factory/config.json`). It asks. It does not block. A block always wins over an ask.
    - A redirect or `tee` into one. The destination of `cp`, `install`, `ln` or `rsync`. `mv`, `rm`, `shred`, `truncate` and `unlink` on one.
    - `sed -i`, `dd of=`, `curl -o`, `wget -O`, `git rm`, `git mv`, `git restore`, and `git checkout <ref> -- <path>`.
    - `git apply`, `git am` and `patch`. A `python`, `node`, `ruby`, `perl`, `bash` or `sh` one-liner (`-c`, `-e`, `-p`, or a `bash`/`sh` heredoc) that names a control path.
    - Verified by hand on 2026-11-04 (Claude Code in Auto mode, one person, one session): the user saw a permission prompt for a zero-byte append to `factory/hooks/guard.mjs`, and for `git checkout -- factory/hooks/guard.mjs`, which also matched the allow rule `Bash(git checkout*)`. So this hook's `ask` reached the user in Auto mode and beat an allow rule.
  - **Fails closed:**
    - An internal guard error, empty or unparsable input, or a failed git read during the secret scan blocks the call (exit 2).
    - A config that cannot be read makes every edit ask, and blocks every shell command. Edits to `.env` stay blocked.
    - The hook command in `.claude/settings.json` ends in `|| exit 2`. A crash before the guard runs (missing file, syntax error) also blocks.
    - A weak or empty project config cannot turn the built-in protections off.
  - **Not covered** (seen by test or by running the guard by hand; GitHub branch protection and human review are the defence for these):
    - A path built from pieces: a shell variable, a glob, or a `$( )` part.
    - The body of a script or of `npm run <x>`.
    - The quoted body of `bash -lc`, `sh -ec`, `zsh -c` or `eval`. The delete and write rules do not read it. A `bash -c` or `sh -c` body is read only for a control path, so a delete of a protected path inside it is not seen. The block list for pushes, resets and the like scans the raw text, so it still sees these bodies and the wrapper words below.
    - A delete, move or write that starts with a wrapper word or a prefix: `sudo`, `env`, `time`, `xargs`, `FOO=1 cmd`. The same holds for a command after `do` or `then` in a `for` or `if` body. A redirect in those bodies is still seen. `find -delete` is not seen.
    - `git -C <dir> push` and `git -c <setting> push`.
    - A protected branch name that the shell builds: a backslash inside the name, an ANSI-C quote (`$'...'`), a `$( )` part, a shell variable, or a brace list. A push inside `$( )`, backticks, `<( )`, `>( )` or a subshell `( )` is also not seen when the closing paren or backtick touches the branch name: it sticks to the name. A push in a `{ ...; }` group, or in a subshell with a space before the closing paren, is seen.
    - A command inside process substitution (`<( )` or `>( )`). The delete, move and push rules do not read it. A redirect to a control file inside it is still seen.
    - Several backslash-newline pairs in one command, when the shell joins some of them and keeps others. The guard checks the text as written and the text with every pair joined. A comment that ends in a backslash, or a quoted heredoc whose last line ends in a backslash, together with a split word on a later line, hides the command in both readings. Each of the two alone is caught. A full fix needs a join that tracks comments, single quotes and quoted heredocs. Checked by running the guard. Commit `6fc7d70` has the same gap.
    - A quote nested inside a `$( )` body that holds an apostrophe can hide a later substitution. This needs a `$( )` inside double quotes, with a double-quoted word that has an apostrophe in it. The quote tracker reads the text once from left to right, so it cannot model quotes nested inside `$( )`. Checked by running the guard. Commit `6fc7d70` has the same gap.
    - A very deep nest of `$( )`. Every `$( )` body that the scan lists is checked, at any depth, and a body is not checked twice at the same depth. A second pass over each body's own text goes four levels deep. Measured with the guard on a harmless command: a nest 150 deep takes about 0.1 s (0.2 s with the hook start), and a nest 600 deep takes about 6 s. The time grows faster than the depth. A delete at the bottom of a nest 600 deep is still blocked. Not measured beyond 600. The hook `timeout` in `.claude/settings.json` is 20 s. What Claude Code does when a hook times out is not verified.
    - The secret scan of a commit. It runs only when the text holds `git commit` with plain white space between the two words. It is skipped for `git -c <setting> commit`, `git -C <dir> commit`, and a `git` or `commit` word that a backslash-newline splits. Such a commit is not scanned.
    - `git checkout <ref> <path>` without `--`. It is blocked for a protected path. It is not seen as a write to a control file.
    - A `python3 - <<EOF` or `node <<EOF` heredoc.
    - Tools that write in place (`prettier --write`, `lint --fix`) and editors.
    - MCP tools. The hook watches only Bash, Edit, Write and NotebookEdit. An MCP file tool, such as the GitHub tool that writes a file to a repo, never reaches it. Only a few MCP tools are denied by name in `.claude/settings.json`.
    - A `cd` made in an earlier command. The protected-path blocks follow a `cd` inside one command only. The control-file ask also reads the directory the shell starts in, from the hook input. The tests give that directory by hand. Not verified in a live session.
    - A raw-text false positive: quoted prose that contains an attack string is blocked, because the block list scans the raw text. Put a PR body in a file and use `--body-file`. Put a commit message in a file and use `git commit -F`.
- `git commit <paths>` (commit only some files, no `-a`) is not scanned for secrets. `git commit -a` and `git add ... && git commit` are.
- **Fewer files ask on edit since commit `66e3b1a`.** Inside `factory/`, only `factory/hooks/` and `factory/bin/lib.mjs` ask before an edit. The settings files, `.factory/config.json` and `.github/workflows/` ask too. These no longer ask: `factory/bin/factory.mjs` (it holds the gate: `gateProblems`, `waive` and `close`), `factory/spec/*`, `factory/install.mjs` and `factory/settings.template.json`. A shell write to them stays silent as well (checked by running the guard). So a change to the gate code, or to the tests that check the guard, makes no prompt. Three things cover those files: the integrity scan, the independent code review, and GitHub branch protection. The integrity scan is narrow. It flags added suppression words (a skipped or `.only` test, `eslint-disable`, `@ts-ignore` and the like) in every JavaScript or TypeScript file, and net-removed assertions in test files only. It does not judge any other change.
- `F check <id> <name>` reads the command with `Object.hasOwn`, so a name like `constructor`, `__proto__` or `toString` ends with the plain error `No command for check ...` (exit 1) and writes nothing. `F repair <id> <key>` and `F resolve <id> <key>` look up `task.issues[key]` in the old way: a key like `constructor` or `__proto__` is not guarded there. The review reported it and it is not fixed. It is a crash in the CLI, and no text from the user runs.
- The `factory-reviewer` and `factory-qa` read-only rule is prompt text on the Claude side. The generated Codex copies set a sandbox (`read-only` for the reviewer, `workspace-write` for QA because it must run checks that write temp files and coverage).
- The issue workflow gives the agent write access. The only approval step is that a person with triage rights must add the `factory` label. Read the issue before you label it: its text is untrusted input.
- A reinstall adds a settings hook only when its exact command is missing. If you changed a hook command by hand, the old and new command can both stay.
- A reinstall never removes a rule the target already has, so a broader allow rule stays. If the target has a blanket `npm run` rule (`npm run *`, `npm run:*` or `npm run*`), the installer prints a warning and keeps it. It does not warn about other broad rules, such as `npm *` (checked by reading `factory/install.mjs`, not by a test). Remove such a rule by hand to be asked before scripts such as deploy.
- `F check <id> <name> -- <cmd>` is refused for every name (required, configured and unknown): nothing runs and nothing is recorded. A check runs its configured command only. To change a command, edit `.factory/config.json`, which is a control file that the human approves. This is hygiene, not a wall: `F check <id> unit` and `F check <id> factory-specs` still run test files that an agent can edit, and the allow rule for the CLI does not ask the human.
- The gate does not check who sets `--trivial`. `F set <id> trivial true` works at any time. A trivial task passes the gate with no code review, and with a stale APPROVE. A latest code review of CHANGES or REJECT blocks it, like any other task, until a later review approves. Plan-mode reviews never count. Only the Director sets it, for a one-line doc or copy fix.
- The workflow does not set `queue: max`. Without it, GitHub keeps one running and one pending run, and a new run replaces the pending one. So a label event can be dropped when labels arrive close together. Re-label an issue if its run does not start.
