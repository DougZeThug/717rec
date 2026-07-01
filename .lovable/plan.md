# Dependency advisory patch plan

Small, targeted `package.json` bumps + `overrides` for transitives. No app code changes.

## Changes to `package.json`

### `devDependencies`
- `vite`: `7.3.2` → `^7.3.6` (latest 7.x; kills the pinned-old advisory)
- `vitest`: `4.1.8` → `^4.1.9` (matches the already-installed `@vitest/coverage-v8@4.1.9`, so the "vitest/coverage version mismatch" warning disappears)
- `@vitest/coverage-v8`: `^4.1.9` (unchanged, already latest)

### `dependencies`
- `react-is`: `^19.2.7` → `^18.3.1`
  - Rationale: peer of `react@18` currently in the tree; the stray 19.x drops peer-mismatch warnings and matches what Radix/Recharts actually resolve against.

### Add `overrides` block (fixes transitive `tmp` and `undici` advisories `npm audit fix` would otherwise touch)

```json
"overrides": {
  "tmp": "^0.2.5",
  "undici": "^7.16.0"
}
```

Currently pulled in via:
- `@lhci/cli` → `inquirer` → `external-editor` → `tmp@0.0.33` (and `tmp@0.1.0`)
- `exceljs` → `tmp@0.2.5`
- `jsdom` → `undici@7.25.0` (already patched, override just pins a floor across the tree)

## Version research (latest that still works)

| Pkg | Installed | Target | Latest overall | Why not latest |
|---|---|---|---|---|
| vite | 7.3.2 | 7.3.6 | 8.1.2 | User asked to stay on 7.x; 8.x is a major |
| vitest | 4.1.8 | 4.1.9 | 4.1.9 | — |
| @vitest/coverage-v8 | 4.1.9 | 4.1.9 | 4.1.9 | — |
| react-is | 19.2.7 | 18.3.1 | 19.2.7 | Peer must match `react@18` in this repo |
| tmp (override) | 0.0.33 / 0.1.0 / 0.2.5 | ^0.2.5 | 0.2.5 | — |
| undici (override) | 7.25.0 | ^7.16.0 | 7.25.0 | Floor-only override |

## Steps

1. Edit `package.json` with the version bumps + `overrides` block above.
2. Run `npm install` to refresh `package-lock.json` and `bun install` to refresh `bun.lock` (the Lovable builder uses `bun install --frozen-lockfile`).
3. Verify: `npm run typecheck`, `npm run build`, `npm run lint`, `npm run test:coverage`.
4. Spot-check that the "vitest / @vitest/coverage-v8 version mismatch" console warning is gone.

## Risk

Low. All bumps are patch/minor within the same major, plus a downgrade of `react-is` to match the actual React major already in use. Overrides only affect deep transitives already close to the pinned versions.
