# Fix JS-0125: `importScripts` is not defined

## What's happening
DeepSource flags `importScripts(...)` in `public/progressier.js` as an undeclared variable. `importScripts` is a real, built-in function in service workers — it's how a service worker loads other scripts. The file already has `/* eslint-env serviceworker */` at the top, but DeepSource's analyzer isn't honoring that env directive, so it still treats `importScripts` as unknown.

## The fix
Add an explicit `/* global importScripts */` comment to `public/progressier.js`. This is the exact mechanism DeepSource recommends in the finding's description ("the variable is explicitly mentioned in a `/*global ...*/` comment"). The `eslint-env` line stays so local ESLint keeps working.

### Change
File: `public/progressier.js`

```js
/* eslint-env serviceworker */
/* global importScripts */
importScripts("https://progressier.app/zSi8fMHT6esPjglbvDZn/sw.js");
```

That's the entire diff — one new comment line, no behavior change.

## How to verify
- The service worker still registers and Progressier still loads (no runtime change — comments only).
- Re-run DeepSource; the JS-0125 finding on this file clears.
