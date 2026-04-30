## What's vulnerable

`npm audit` reports **4 moderate** issues, but they all collapse to **one root cause**: the `uuid` package advisory **GHSA-w5hq-g745-h8pq** ("Missing buffer bounds check in v3/v5/v6 when `buf` is provided"). Fixed in `uuid@11.1.0` and above.

| Package | Installed | Vulnerable via | Fix path |
|---|---|---|---|
| `uuid` (nested) | 8.3.2, 9.0.1 | direct advisory | force to 11.x via override |
| `brackets-manager` | 1.9.1 | depends on `uuid@^9` | covered by uuid override |
| `brackets-viewer` | 1.9.0 | depends on `brackets-manager` | covered by uuid override |
| `exceljs` | 4.4.0 | depends on `uuid@^8` | covered by uuid override |

You already have `uuid@14.0.0` as a top-level dependency (which is patched). The vulnerable copies are **nested** inside `brackets-manager` and `exceljs`. `npm audit`'s suggested "fix" is to *downgrade* those packages — that would break things and is the wrong move.

## Why the vulnerability is low practical risk for this app

The advisory only triggers when code calls `uuid.v3()`, `v5()`, or `v6()` and **passes a custom `buf` argument**. Neither `brackets-manager` nor `exceljs` does this — they only use `uuid.v4()` to generate match/cell IDs with no custom buffer. So real exploitability here is essentially zero. The audit warning is still worth silencing so the count stays clean.

## Recommended fix (safe, ~2 minute change)

Add a single npm `overrides` entry pinning every nested `uuid` to a patched version. This is the standard way to dedupe a transitive dep without touching the parent packages.

```json
"overrides": {
  "sucrase": "3.32.0",
  "glob": "13.0.6",
  "uuid": "$uuid"
}
```

The `"$uuid"` syntax tells npm "use whatever version is in `dependencies.uuid`" — which is already `14.0.0`. This:

- forces `brackets-manager`, `brackets-viewer`, and `exceljs` to use `uuid@14`
- keeps `brackets-manager 1.9.1`, `brackets-viewer 1.9.0`, and `exceljs 4.4.0` exactly as-is (no API changes)
- removes all 4 audit warnings
- requires no source code changes

### Risk assessment

- **uuid v8 → v14 API change for consumers**: `v4()` signature is unchanged across 8/9/14, which is the only function `brackets-manager` and `exceljs` use. The breaking changes between those majors were around ESM-only exports, removal of deep imports (`uuid/v4`), and the `v3/v5/v6` buf bounds check itself. Both libraries import the top-level package, so they're compatible.
- **Bun lockfile**: project uses `bun.lock`. Bun honors npm `overrides`, so no extra config needed.
- **Verification**: after applying, run `npm audit --registry=https://registry.npmjs.org/` (sandbox proxy doesn't support audit) — expect 0 vulnerabilities. Then run the existing test suite (`npm test` or fast coverage) to confirm bracket creation and Excel export still work.

## Steps I'll take when you approve

1. Add `"uuid": "$uuid"` to the `overrides` block in `package.json`.
2. Reinstall to refresh `bun.lock` / `node_modules`.
3. Run the bracket and Excel-export test files specifically (`SupabaseSqlStorage.test.ts`, the matchups Excel export tests) to confirm no regression.
4. Report the new audit count and which tests passed.

## What I will NOT do

- Won't downgrade `brackets-manager` to 1.5.10 or `exceljs` to 3.4.0 (npm's suggested "fix") — those are major regressions that would break existing playoff and export features.
- Won't touch source code; this is purely a dependency dedupe.
