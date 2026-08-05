# Fix the failing deploy build (`npm ci` lockfile error)

## What is going wrong

The hosting build runs `npm ci`, which refuses to install because `package-lock.json`
does not list the platform-specific packages the build machine needs. I reproduced the
exact failure locally:

```text
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json are in sync.
npm error Missing: @swc/core-linux-arm64-gnu@1.15.11 from lock file
npm error Missing: @esbuild/linux-arm64@0.25.12 from lock file
npm error Missing: fsevents@2.3.3 from lock file
... (dozens more platform variants)
```

The long "npm error --strict-peer-deps / --allow-scripts / ..." wall you pasted is just
npm printing its help text after that error, so the real cause was cut off at the top.

Why it came back: the lockfile was last written by an npm run inside this Linux x64
sandbox, which prunes optional packages for other platforms (macOS, Windows, ARM). The
newer npm on the build machine treats those omissions as "out of sync" and stops.

## The fix

1. Regenerate `package-lock.json` with the same npm major version the build machine uses
   (npm 12), metadata only, so every platform's optional packages are recorded:
   `npx npm@12 install --package-lock-only`
2. Confirm the private-cache URLs stay pointed at `registry.npmjs.org` (a stray one would
   break installs outside Lovable).
3. Pin the toolchain so the build and this sandbox stop disagreeing: add `engines.node`
   and a `.nvmrc` matching the build environment's Node 24.
4. Verify with `npx npm@12 ci --dry-run` (must print "up to date" / no EUSAGE) and then a
   normal `npm run build` to make sure the app still compiles.

No application code or dependency versions change - only lockfile metadata and the Node
version pin.

## Note for future changes

Any time dependencies change from inside this sandbox, the lockfile has to be re-written
with the npm 12 step above, otherwise the same deploy failure returns.
