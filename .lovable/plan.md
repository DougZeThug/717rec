## Plan: Apply Dependabot dependency updates

### Risk review

All 39 updates are low-risk patch/minor bumps:
- **Radix UI packages** (~36 of them): mostly patch bumps (e.g. `1.2.12 → 1.2.13`). A handful are minor bumps (`react-context-menu 2.2.16 → 2.3.0`, `react-radio-group 1.3.8 → 1.4.0`, `react-select 2.2.6 → 2.3.0`, `react-slider 1.3.6 → 1.4.0`, `react-switch 1.2.6 → 1.3.0`). Radix follows semver strictly; minor bumps add props but don't break existing APIs.
- **@capacitor/core** `8.3.4 → 8.4.0`: minor bump within the same major. No breaking changes expected.

No known breaking changes for any of these versions.

### Steps

1. Update `package.json` with the new versions listed in the Dependabot PR (all 39 packages).
2. Run `npm install` to refresh `package-lock.json` (`.npmrc` has `legacy-peer-deps=true`, so peer-dep issues won't block install).
3. Run the typecheck/build (handled automatically by the harness) to confirm nothing fails to compile.
4. Run `npm test` to confirm the full vitest suite still passes — important because we have Radix-heavy components (Select, Tabs, Tooltip, etc.) covered by tests and we already maintain jsdom polyfills for Radix.
5. Spot-check the preview UI for any visual regression in commonly-used Radix surfaces (dropdowns, dialogs, selects, tabs).

### Rollback

If tests or build fail, revert `package.json` + `package-lock.json` to the pre-update state and investigate the offending package individually.
