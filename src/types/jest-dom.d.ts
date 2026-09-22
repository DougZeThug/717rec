import 'vitest';

import type matchers = require('@testing-library/jest-dom/matchers');

declare module 'vitest' {
  interface Assertion<R extends void | Promise<void> = void, T = unknown>
    extends matchers.TestingLibraryMatchers<any, T> {}
  interface AsymmetricMatchersContaining
    extends matchers.TestingLibraryMatchers<any, any> {}
}
