

## Dependency Bump: 9 Packages (Minor/Patch)

All updates are minor or patch bumps with no breaking changes expected.

| Package | From | To | Type | Risk |
|---------|------|----|------|------|
| `react-resizable-panels` | ^4.6.5 | ^4.7.5 | Minor | Low |
| `react-router` | ^7.13.0 | ^7.13.1 | Patch | Minimal |
| `react-router-dom` | ^7.13.0 | ^7.13.1 | Patch | Minimal |
| `recharts` | ^3.7.0 | ^3.8.0 | Minor | Low — used in charts |
| `@vitejs/plugin-react-swc` | ^4.2.3 | ^4.3.0 | Minor | Minimal (build tool) |
| `autoprefixer` | ^10.4.24 | ^10.4.27 | Patch | Minimal |
| `globals` | ^17.3.0 | ^17.4.0 | Minor | Minimal (dev) |
| `jsdom` | ^28.1.0 | ^29.0.1 | **Major** | Low — test env only |
| `postcss` | ^8.5.6 | ^8.5.8 | Patch | Minimal |

### Notes

- **`jsdom` 28→29**: Major bump but only affects the test environment. The jsdom 29 release primarily modernizes internals; the `vitest` `environment: 'jsdom'` integration handles the adapter. No test code changes expected.
- **`recharts` 3.7→3.8**: Minor bump. The project uses standard `LineChart`, `BarChart`, `RadarChart`, `ResponsiveContainer` APIs — all stable across this range.
- **`react-resizable-panels` 4.6→4.7**: Used in `src/components/ui/resizable.tsx` via `Group`, `Panel`, `Separator` imports — API unchanged.

### Plan

1. **Update `package.json`** — bump all 9 version ranges
2. **Run `tsc --noEmit`** — verify no type regressions (especially from recharts/jsdom)
3. No code changes expected

