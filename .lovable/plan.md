

## Fix: Published Build Failing Due to ESLint Peer Dependency Conflict

### Problem
`eslint-plugin-react-hooks@7.0.1` only supports ESLint up to v9, but the project uses ESLint v10. The React team hasn't released a compatible version yet (open issue on GitHub). The preview works fine, but the published build uses strict `npm ci` which fails on peer dependency conflicts.

### Solution
Create an `.npmrc` file with `legacy-peer-deps=true` so the published build tolerates this known peer dependency mismatch.

### Changes

**New file: `.npmrc`**
```
legacy-peer-deps=true
```

This is a single-file addition. The plugin works fine with ESLint 10 at runtime -- it's purely a metadata issue in the package's `peerDependencies` field that hasn't been updated yet. Once the React team releases a compatible version, the `.npmrc` workaround can be removed.

