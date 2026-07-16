# 717REC

717REC is the league management app for a recreational cornhole league in
Lancaster, PA. It runs the full season lifecycle: teams and rosters, weekly
match scheduling (including auto-scheduling), score submission and admin
score entry, standings and power rankings, playoff brackets, and season
history — plus an admin dashboard for managing all of it.

The project started on [Lovable](https://lovable.dev/projects/71485458-eece-4db2-a818-0dbc3e38e42e)
and can still be edited there; changes made via Lovable are committed back to
this repo automatically.

## Tech stack

- **Frontend**: React 18 + TypeScript + Vite, styled with Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Server state**: TanStack Query v5
- **Playoff brackets**: [`brackets-manager`](https://github.com/Drarig29/brackets-manager.js)
- **Tests**: Vitest + Testing Library (unit/integration), Playwright (browser E2E)

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full picture: project
structure, routing, data flow, and the service-layer rules.

## Getting started

Requires Node.js 20+ and npm. Day-to-day development and CI are npm-based —
`npm ci` installs from `package-lock.json`, and `.npmrc` sets
`legacy-peer-deps=true`. Do not use pnpm or yarn. One additional lockfile is
tracked on purpose: `deno.lock` (Supabase edge functions).

```sh
git clone <repo-url>
cd 717rec
npm ci          # install exact dependencies from package-lock.json
npm run dev     # start the Vite dev server on http://localhost:8080
```

## Environment setup

Copy `.env.example` to `.env` and fill in the values from your Supabase
project (Dashboard → Project Settings → API). All variables prefixed with
`VITE_` are publishable/browser-safe — access control is enforced by Supabase
Row Level Security. **Never** put a `service_role` key in a `VITE_*` variable
or any frontend `.env` file. See [`docs/SECRETS.md`](docs/SECRETS.md) for the
full guide and what to do if a secret is accidentally committed.

Every pull request runs [Gitleaks](https://github.com/gitleaks/gitleaks)
secret scanning (the `gitleaks` job in `.github/workflows/security.yml`).
Commits that contain API keys or Supabase `service_role` JWTs will fail CI;
tune `.gitleaks.toml` if you hit a false positive.

## Testing

```sh
npm test                 # full Vitest suite
npm run test:coverage    # fast coverage gate (parallel workers)
npm run e2e              # Playwright browser suite
```

[`TESTING.md`](TESTING.md) is the single source of truth for everything else:
the full command list, the coverage baseline and threshold policy, E2E setup,
manual QA expectations, and the coverage hang triage playbook.

## Continuous integration

Four GitHub Actions workflows live in `.github/workflows/`:

| Workflow | File | What it runs |
| --- | --- | --- |
| CI | `ci.yml` | `quality`: lint, typecheck, full test suite, knip dead-code check. `deepsource-coverage`: generate LCOV coverage, enforce thresholds, and report to DeepSource. `build-size`: production build + bundle-size budgets. `browser`: Playwright smoke tests, blocking axe a11y scan, Lighthouse. `react-doctor`: React best-practice scan. `e2e-real-backend`: E2E golden path against a real Supabase backend. |
| Security | `security.yml` | `audit`: npm audit. `committed-env-files`: fails if local `.env` files are tracked. `gitleaks`: secret scan on PRs, pushes to main, and a weekly cron. |
| Supabase CI | `supabase-ci.yml` | `db-lint`: `supabase db lint`. `db-apply-and-smoke`: apply migrations + SQL smoke tests. `edge-function-tests`: edge-function Deno tests. |
| Summarize new issues | `summary.yml` | Posts an AI-generated summary comment on newly opened GitHub issues. |

## Deployment

Production deploys go through **Lovable Publish** (open the
[Lovable project](https://lovable.dev/projects/71485458-eece-4db2-a818-0dbc3e38e42e)
and click Share → Publish); the published SPA is served through Cloudflare,
with HTTP security headers defined in [`public/_headers`](public/_headers).
For governed releases (versioning, tags, deployment checklist, rollback
steps), use the runbook in
[`docs/RELEASE_AND_DEPLOYMENT.md`](docs/RELEASE_AND_DEPLOYMENT.md).

A custom domain can be connected in Lovable under Project → Settings →
Domains ([guide](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)).

## Documentation map

| Doc | What's in it |
| --- | --- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Stack, project structure, routing, data flow, service-layer rules |
| [`TESTING.md`](TESTING.md) | Test commands, coverage baseline and thresholds, E2E setup, manual QA checklists |
| [`CLAUDE.md`](CLAUDE.md) | Working agreements for AI agents (and humans): architecture rules, service template, test-running notes |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | Production settings inventory, league-night incident playbook, standings reconciliation query |
| [`docs/`](docs/) | Deep dives: secrets handling, release runbook, Supabase CI, RLS notes, bracket schema, past audits |
