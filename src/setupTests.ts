import '@testing-library/jest-dom';

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { cleanup, configure } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, expect, vi } from 'vitest';
import { toHaveNoViolations } from 'vitest-axe/dist/matchers';

// Vitest 5 no longer reads matcher types from the global `jest.Matchers`, and
// @testing-library/jest-dom 7.0.1 declares its matchers only there. This block
// adds them to Vitest's own `Matchers<R, T>`, so `expect(el).toBeInTheDocument()`
// type-checks again. Runtime is unchanged: the import above registers them.
// Delete this block when jest-dom ships Vitest 5 types:
// https://github.com/testing-library/jest-dom/issues/738
declare module 'vitest' {
  // R and T must keep these names to merge with Vitest's own declaration, so T
  // stays even though it is unused. The first argument is the type jest-dom
  // accepts for asymmetric matchers such as expect.stringContaining(), which
  // Vitest types as `any` anyway.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars -- declaration merge, not a new type
  interface Matchers<R, T> extends TestingLibraryMatchers<unknown, R> {}
}

expect.extend({ toHaveNoViolations });

// NumberFlow draws its digits inside a custom element that jsdom cannot start:
// the first re-render throws "this.el?.willUpdate is not a function". Tests
// render an empty span that carries the value in `data-value`. The real number
// is in the plain-text copy each caller keeps for screen readers. Real
// animation is browser-only.
vi.mock('@number-flow/react', () => ({
  default: (props: { value: number; 'aria-hidden'?: 'true' | 'false' }) =>
    createElement('span', { 'data-value': props.value, 'aria-hidden': props['aria-hidden'] }),
}));

// Provide safe default Supabase env vars for sandboxed agent shells (Codex /
// Claude Code) where Vite's .env auto-loading isn't available. Tests always
// mock the supabase client; these placeholders only exist to keep the client
// module from throwing at import time. Real values from .env take precedence.
const testEnvDefaults: Record<string, string> = {
  VITE_SUPABASE_URL: 'http://localhost:54321',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  VITE_SUPABASE_PROJECT_ID: 'test-project',
};
for (const [key, value] of Object.entries(testEnvDefaults)) {
  if (!import.meta.env[key]) {
    (import.meta.env as Record<string, string>)[key] = value;
  }
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// React Testing Library already auto-runs cleanup() after each test because
// 'globals: true' is set in vitest.config.ts. We register it explicitly here
// too so the guarantee is visible and survives any change to that setting.
//
// We deliberately do NOT add a global vi.useRealTimers() / vi.restoreAllMocks()
// here: Vitest's per-file isolation already stops timer/mock state from leaking
// between files, and a blanket reset would break files that intentionally set
// fake timers or spies at file scope. Those files own their own teardown.
//
// Mock hygiene: new tests that override shared mock implementations should
// prefer vi.resetAllMocks() in their own afterEach(). vi.clearAllMocks() only
// clears call history, so stale mockReturnValue/mockImplementation stubs can
// leak between tests in the same file.
afterEach(() => {
  cleanup();

  // Radix overlays (dropdown, popover, dialog) lock the page while open by
  // setting pointer-events on <body> and adding portal containers. cleanup()
  // unmounts the React tree, but a test that ends with an overlay still open
  // leaves those marks behind, and the next test's first click lands on them
  // instead of the element it targets. Clear them here.
  document.body.style.removeProperty('pointer-events');
  document.body.removeAttribute('data-scroll-locked');
  for (const node of document.querySelectorAll(
    '[data-radix-portal],[data-radix-popper-content-wrapper]'
  )) {
    node.remove();
  }
});

// This makes "screen" available in tests and ensures proper React 18+ testing
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock next-themes to prevent SSR hydration issues in tests
globalThis.matchMedia =
  globalThis.matchMedia ||
  function (query: string): MediaQueryList {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true, // MediaQueryList.dispatchEvent returns boolean
    } as MediaQueryList;
  };

// Mock DOM methods missing in jsdom for Radix UI compatibility
for (const proto of [Element.prototype, HTMLElement.prototype]) {
  if (!proto.hasPointerCapture) {
    proto.hasPointerCapture = () => false;
  }
  if (!proto.setPointerCapture) {
    proto.setPointerCapture = () => undefined;
  }
  if (!proto.releasePointerCapture) {
    proto.releasePointerCapture = () => undefined;
  }
  if (!proto.scrollIntoView) {
    proto.scrollIntoView = () => undefined;
  }
}

// jsdom doesn't implement window.scrollTo — stub it to silence "Not implemented" warnings
window.scrollTo = (() => undefined) as typeof window.scrollTo;
Element.prototype.scrollTo = (() => undefined) as typeof Element.prototype.scrollTo;

// jsdom doesn't implement HTMLCanvasElement.getContext — stub a 2D context so
// components that touch canvas (charts, measureText, etc.) don't crash tests.
const createMockCanvasContext = () => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  rect: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  clip: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  transform: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({
    width: 0,
    actualBoundingBoxAscent: 0,
    actualBoundingBoxDescent: 0,
  })),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createPattern: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(),
    width: 0,
    height: 0,
  })),
  putImageData: vi.fn(),
  canvas: document.createElement('canvas'),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  writable: true,
  value: vi.fn(() => createMockCanvasContext()) as unknown as HTMLCanvasElement['getContext'],
});

// Mock IntersectionObserver for better test compatibility with complete interface
globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ||
  class IntersectionObserver {
    root: Element | null = null;
    rootMargin = '0px';
    thresholds: ReadonlyArray<number> = [];
    scrollMargin = '0px';

    /** Starts observing an element; no-op in jsdom tests. */
    // skipcq: JS-0105 -- the real IntersectionObserver API is instance methods.
    observe() {
      return null;
    }
    /** Disconnects all observed elements; no-op in jsdom tests. */
    // skipcq: JS-0105 -- the real IntersectionObserver API is instance methods.
    disconnect() {
      return null;
    }
    /** Stops observing an element; no-op in jsdom tests. */
    // skipcq: JS-0105 -- the real IntersectionObserver API is instance methods.
    unobserve() {
      return null;
    }
    /** Returns queued intersection records; always empty in jsdom tests. */
    // skipcq: JS-0105 -- the real IntersectionObserver API is instance methods.
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
