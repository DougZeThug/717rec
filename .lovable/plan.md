## Fix: Lockfile out of sync

The build fails because `bun install --frozen-lockfile` detects that the committed lockfile no longer matches `package.json`. This usually happens after a dependency was added, removed, or changed without regenerating the lockfile.

### What I will do
1. Inspect `package.json` and the lockfile (`bun.lockb`) to confirm the mismatch.
2. Run `bun install` without `--frozen-lockfile` locally to regenerate the lockfile.
3. Verify that the project still builds and the basic test gate passes.
4. Commit only the updated lockfile (and any small package.json correction if needed).

### What you need to know
- No application code will change.
- If `package.json` references a dependency version that cannot resolve, I will stop and ask before choosing an alternative.
- After the lockfile is updated, the Lovable build should restore cleanly from cache.

### Verification
- `bun install` completes without the frozen-lockfile error.
- `npm run typecheck` passes.
- `npm run build` passes.
- `npm run lint` still passes.
- One targeted test file runs successfully.

### Files that may change
- `bun.lockb` (lockfile regenerated)
- `package.json` only if a dependency entry is malformed or missing a valid range