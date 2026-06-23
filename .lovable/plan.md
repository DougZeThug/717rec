## Problem

DeepSource flags `importScripts` as undefined in `public/progressier.js`. The file is a **service worker** registered by Progressier, where `importScripts` is a valid global provided by the ServiceWorkerGlobalScope. The lint rule simply doesn't know that.

This is a false positive — no runtime bug. The fix is to tell the linter the file runs in a service worker context.

## Fix

Add an ESLint environment hint at the top of `public/progressier.js` so DeepSource (which respects ESLint's `/* global */` and `/* eslint-env */` directives) recognizes `importScripts`:

```js
/* eslint-env serviceworker */
importScripts("https://progressier.app/zSi8fMHT6esPjglbvDZn/sw.js");
```

That single comment marks the file as a service worker, which exposes `importScripts`, `self`, `clients`, etc. as known globals. No behavior change.

## Files

- `public/progressier.js` — add the `/* eslint-env serviceworker */` comment on line 1.

## Verification

- File still loads identically in the browser (comments are ignored at runtime).
- DeepSource JS-0125 warning for `importScripts` clears on the next scan.
