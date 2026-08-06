# Dependabot production-dependencies group bump

## What this is

Dependabot opened one grouped update covering 49 production packages: Capacitor, the Radix UI component set, form helpers, and the Lovable MCP library. These are routine minor/patch upgrades, not breaking major versions.

## Current state

`package.json` already carries some of these targets from earlier security work: `@lovable.dev/mcp-js` is at `^0.26.1`, and `react-router`/`react-router-dom` are at `^7.18.2`. Every listed dependency is declared with a caret (`^`) range, so most bumps are lockfile-only refreshes; the rest need the declared floor raised.

## What will be done

1. Raise the declared ranges in `package.json` to the versions in the list — for example `@capacitor/core` to `^8.5.0`, `@capgo/capacitor-social-login` to `^8.3.39`, `@hookform/resolvers` to `^5.7.1`, and each Radix package to its listed version (`@radix-ui/react-slot` goes to `^1.3.3`). Entries already at or above the target are left alone.
2. Refresh `package-lock.json` with a single npm install so the resolved tree matches, keeping the public `registry.npmjs.org` URLs intact.
3. Verify nothing regressed:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - Targeted tests for the UI most likely to shift: Radix Select, Dialog, Tabs, Tooltip usage.
4. If a Radix change breaks a test or a component, fix the component rather than pinning back, and report exactly what changed.

## Notes

- No application features change; this is dependency maintenance.
- React stays on 18 (Dependabot is configured to hold back React 19) and no major versions are crossed.
- `bun.lock` also exists in the repo, but the project installs with npm, so `package-lock.json` is the lockfile regenerated here.