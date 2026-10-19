# Bump the production-dependencies group (35 updates)

## What changes
- Raise the 35 packages in `package.json` to the versions in the Dependabot list.
- Refresh both lockfiles: `npx npm@12 install --package-lock-only`, then `bun install --lockfile-only`.
- Keep the existing qs safety rule for the MCP server packages.

## Risk to watch
- **@lovable.dev/mcp-js 3.0.5 -> 3.1.0 is a minor update.** It may unpin the MCP SDK and clear the old SDK warning. It may also change tool or auth types. I run the MCP tests to check.
- All other updates are patch or small minor updates (Radix, Sentry, Supabase, framer-motion 14.1 -> 14.3, zod, Playwright). Low risk.

## Checks
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run size`.
- Focused tests: MCP tools, auth, contact/Join form, playoff score editor, Radix dropdown and dialog tests, animation tests.
- A dependency security scan. If mcp-js 3.1.0 clears the old warnings, I remove the stale allowlist entries.
- A test run of the deploy install against `bun.lock`.

No app code changes are expected. Small type fixes only if mcp-js 3.1.0 needs them.
