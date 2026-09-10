import { onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initOnlineStatus } from '../onlineStatus';

const setBrowserOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
};

beforeEach(() => {
  setBrowserOnline(true);
  onlineManager.setOnline(true);
});

afterEach(() => {
  setBrowserOnline(true);
  onlineManager.setOnline(true);
});

describe('initOnlineStatus', () => {
  // The manager hardcodes `true` and its own setup never reads the browser, so
  // an app opened at a venue with no signal used to believe it had one: no
  // offline banner, and live rounds sent down the failing path instead of
  // being parked.
  it('starts offline when the browser is already offline', () => {
    setBrowserOnline(false);

    initOnlineStatus();

    expect(onlineManager.isOnline()).toBe(false);
  });

  it('starts online when the browser has a connection', () => {
    setBrowserOnline(true);

    initOnlineStatus();

    expect(onlineManager.isOnline()).toBe(true);
  });

  it('still follows the browser after startup', () => {
    initOnlineStatus();

    setBrowserOnline(false);
    window.dispatchEvent(new Event('offline'));
    expect(onlineManager.isOnline()).toBe(false);

    setBrowserOnline(true);
    window.dispatchEvent(new Event('online'));
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('re-reads the browser if the listener is installed again', () => {
    initOnlineStatus();

    setBrowserOnline(false);
    // What the manager does for itself when a subscriber returns after the
    // last one left.
    initOnlineStatus();

    expect(onlineManager.isOnline()).toBe(false);
  });
});
