/**
 * Makes ESLint use the side-by-side TypeScript 6 install.
 *
 * typescript-eslint still needs the JavaScript compiler API, which TypeScript 7
 * (the native Go rewrite) no longer ships. The repo keeps TypeScript 7 as the
 * real compiler for `npm run typecheck`, and a pinned `typescript-6` alias for
 * linting only.
 *
 * Loaded with `node --require`, this hook rewrites every CommonJS
 * `require('typescript')` inside the lint process to the `typescript-6` alias.
 * Nothing else in the project is affected.
 */
const Module = require('node:module');

const ALIAS = 'typescript-6';
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, ...rest) {
  if (request === 'typescript' || request.startsWith('typescript/')) {
    const aliased = ALIAS + request.slice('typescript'.length);
    try {
      return originalResolve.call(this, aliased, ...rest);
    } catch {
      // Alias missing: fall through to the normal resolution below.
    }
  }
  return originalResolve.call(this, request, ...rest);
};
