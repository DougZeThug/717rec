

## Fix: Published Build Still Failing Despite .npmrc

### Problem
The `.npmrc` with `legacy-peer-deps=true` is present, but `npm ci` in the build environment is still failing on the peer dependency conflict between `eslint-plugin-react-hooks@7.0.1` and `eslint@10.0.0`. This is likely because the lockfile was generated with strict peer dependency metadata, and `npm ci` resolves from the lockfile before applying `.npmrc` settings.

### Solution
Add an `overrides` field to `package.json` that explicitly tells npm to use `eslint@10.0.0` when resolving peer dependencies for `eslint-plugin-react-hooks`. This approach is embedded in the lockfile during regeneration and is more reliable than the `.npmrc` flag alone.

### Changes

**`package.json`** -- Add an `overrides` section:
```json
"overrides": {
  "eslint-plugin-react-hooks": {
    "eslint": "$eslint"
  }
}
```

This tells npm: "when `eslint-plugin-react-hooks` asks for `eslint`, use whatever version the root project has installed." The `$eslint` syntax references the root dependency.

The existing `.npmrc` with `legacy-peer-deps=true` will remain as a belt-and-suspenders measure.
