# Fix frozen lockfile deployment error

## Problem
The production build fails with:
```
error: lockfile had changes, but lockfile is frozen
note: try re-running without --frozen-lockfile and commit the updated lockfile
```
This means `bun.lock` no longer matches `package.json`. The build server runs `bun install --frozen-lockfile`, which will not auto-update the lockfile.

## Fix
1. Run `bun install` locally without `--frozen-lockfile` so Bun regenerates `bun.lock` to match `package.json`.
2. Review the diff to make sure only `bun.lock` changes (no unexpected dependency downgrades or upgrades).
3. Verify the fix by running `bun install --frozen-lockfile` again — it should succeed silently.
4. Commit the updated `bun.lock`.

## Out of scope
- I will not change `package.json` unless the lockfile regeneration exposes a real conflict that requires it.
- I will not touch `package-lock.json` unless you want both lockfiles kept in sync; the immediate blocker is `bun.lock`.

## Verification
After the fix, the deployment command that was failing should pass locally: `bun install --frozen-lockfile`.