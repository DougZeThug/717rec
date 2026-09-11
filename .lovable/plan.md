# Bump production-dependencies group (24 updates)

## What this is

A Dependabot-style grouped update for production packages. The listed bumps are mostly minor/patch releases, but `@lovable.dev/mcp-js` jumps from `^0.26.2` to `^2.0.2`, which is a major-version cross and needs a compatibility check.

## Packages to bump

Raise the declared floor in `package.json` for the 10 explicitly listed packages:

| Package | From | To |
| --- | --- | --- |
| @capacitor/core | ^8.5.0 | ^8.5.1 |
| @capgo/capacitor-social-login | ^8.4.4 | ^8.5.5 |
| @lovable.dev/mcp-js | ^0.26.2 | ^2.0.2 |
| @sentry/react | ^10.70.0 | ^10.73.0 |
| @supabase/supabase-js | ^2.112.3 | ^2.115.0 |
| @tanstack/react-query | ^5.101.4 | ^5.102.8 |
| framer-motion | ^13.1.1 | ^13.2.0 |
| lucide-react | ^1.33.0 | ^1.41.0 |
| react-hook-form | ^7.85.0 | ^7.87.0 |
| react-intersection-observer | ^11.0.0 | ^11.0.1 |

The remaining production-dependencies refreshes will be picked up automatically by `npm install` because they are already covered by existing `^` ranges (Radix UI packages, bracket libraries, etc.).

## What will be done

1. Edit `package.json` to raise the floors above. Leave all other ranges unchanged.
2. Run `npm install` to regenerate `package-lock.json` against the public npm registry.
3. Check the major bump for breakage:
   - `@lovable.dev/mcp-js` 0.x -> 2.x: run `npm run typecheck` and inspect `src/lib/mcp/index.ts`, `src/lib/mcp/tools/*.ts`, and `src/lib/mcp/public/index.ts` for changed exports or signatures.
   - If the API changed, update call sites to match the new version rather than pinning back.
4. Verify nothing regressed:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - Targeted tests for MCP tools, Radix UI, and auth flows.

## Notes

- React stays on 18 and no other major versions are intentionally crossed.
- This repo uses npm; `package-lock.json` is the lockfile that will be refreshed.
- If `@lovable.dev/mcp-js` 2.x requires runtime changes that exceed a simple import rename, the scope will be reported before continuing.
