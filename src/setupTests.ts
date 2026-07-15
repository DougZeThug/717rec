import '@testing-library/jest-dom';

import { cleanup, configure } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import { toHaveNoViolations } from 'vitest-axe/dist/matchers';

expect.extend({ toHaveNoViolations });

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
afterEach(() => {
  cleanup();
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
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true, // MediaQueryList.dispatchEvent returns boolean
    } as MediaQueryList;
  };

// Mock DOM methods missing in jsdom for Radix UI compatibility
for (const proto of [Element.prototype, HTMLElement.prototype]) {
  if (!proto.hasPointerCapture) {
    proto.hasPointerCapture = () => false;
  }
  if (!proto.setPointerCapture) {
    proto.setPointerCapture = () => {};
  }
  if (!proto.releasePointerCapture) {
    proto.releasePointerCapture = () => {};
  }
  if (!proto.scrollIntoView) {
    proto.scrollIntoView = () => {};
  }
}

// jsdom doesn't implement window.scrollTo — stub it to silence "Not implemented" warnings
window.scrollTo = (() => {}) as typeof window.scrollTo;
Element.prototype.scrollTo = (() => {}) as typeof Element.prototype.scrollTo;

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

    constructor() {}
    /** Starts observing an element; no-op in jsdom tests. */
    observe() {
      return null;
    }
    /** Disconnects all observed elements; no-op in jsdom tests. */
    disconnect() {
      return null;
    }
    /** Stops observing an element; no-op in jsdom tests. */
    unobserve() {
      return null;
    }
    /** Returns queued intersection records; always empty in jsdom tests. */
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
