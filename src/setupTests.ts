import '@testing-library/jest-dom';

import { configure } from '@testing-library/react';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// This makes "screen" available in tests and ensures proper React 18+ testing
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

// Mock IntersectionObserver for better test compatibility with complete interface
globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ||
  class IntersectionObserver {
    root: Element | null = null;
    rootMargin: string = '0px';
    thresholds: ReadonlyArray<number> = [];

    constructor() {}
    observe() {
      return null;
    }
    disconnect() {
      return null;
    }
    unobserve() {
      return null;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
