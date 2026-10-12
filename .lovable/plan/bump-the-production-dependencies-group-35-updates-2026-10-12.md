# Bump the production-dependencies group (35 updates)

## What changes
- Raise the 35 packages in `package.json` to the versions in the Dependabot list.
- Refresh both lockfiles: `npx npm@12 install --package-lock-only`, then `bun install --lockfile-only`.
- Keep the qs safety rule added last week (MCP server packages only).

## Risk to watch
- **framer-motion 13 -> 14 is a major update.** It can change how animations work. If the type check, build or tests break, I fix small issues. If the fix is large, I keep framer-motion on 13 and update the other 34.
- The Radix updates with new minor versions (dialog, popover, scroll-area, slot, tooltip) can change pop-up behaviour. I run the pop-up tests to check them.
- @lovable.dev/mcp-js 3.0.5 still locks the MCP SDK to 1.28.0, so the known high SDK warning stays.

## Checks
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run size`.
- Focused tests: MCP, auth, validation, the playoff score editor, and the Radix dropdown and dialog tests.
- A search for framer-motion uses, with tests for those parts.
- A dependency security scan.
- A test run of the deploy install against `bun.lock`.

No app code changes are expected, except small fixes if framer-motion 14 needs them.
