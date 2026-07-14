# Fix lockfiles for external installs (Codex, GitHub Actions)

## Problem
`package-lock.json` and `bun.lock` contain package tarball URLs pointing at Lovable's private Artifact Registry cache, which returns 403 outside Lovable:

- `https://europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/...`
- `https://europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/...`

Counts of matching lines today: `bun.lock` 867, `package-lock.json` 26. No other files in the repo reference these hosts.

## Changes (URL normalization only — no version, hash, or tree changes)

1. `package-lock.json` — replace both prefixes:
   - `https://europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/` → `https://registry.npmjs.org/`
   - `https://europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/` → `https://registry.npmjs.org/`
   - Everything after `sandbox-npm-cache/` (path to the `.tgz`) is preserved byte-for-byte.

2. `bun.lock` — same two replacements, same preservation rule.

3. `.npmrc` — set to exactly:
   ```
   registry=https://registry.npmjs.org/
   legacy-peer-deps=true
   ```

## Explicitly not changed
- `package.json`
- Any dependency version, range, or `integrity` / `sha512` hash
- Dependency tree structure in either lockfile
- Any application source

## How it will be executed
Use `sed -i` with the two exact prefix replacements on each lockfile (safe because the strings are unique and appear only in URL positions). Then overwrite `.npmrc` with the two lines above.

## Verification
- `rg -l 'lovable-core-prod|sandbox-npm-cache|europe-west[0-9]+-npm\.pkg\.dev' .` returns no results.
- `git diff --stat` shows only `package-lock.json`, `bun.lock`, `.npmrc` touched.
- Spot-check a few changed lines in each lockfile to confirm only the URL host/path prefix changed and `integrity` fields are untouched.
- Show the resulting diff (with lockfile bodies truncated for readability — full diff available on request).
