import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearOpenState, readOpen, writeOpen } from '@/utils/historyOpenState';

// The key the History page uses in session storage. Written out here on purpose: a test that
// imported it would still pass if somebody renamed it by mistake.
const STORAGE_KEY = 'history_open_state';

const saved = (): unknown => JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');

describe('historyOpenState', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('with working storage', () => {
    it('knows nothing about a season or division it was never told about', () => {
      expect(readOpen('season:s1')).toBeUndefined();
    });

    it('remembers a season as open and as closed', () => {
      writeOpen('season:s1', true);
      expect(readOpen('season:s1')).toBe(true);

      writeOpen('season:s1', false);
      expect(readOpen('season:s1')).toBe(false);
    });

    it('keeps every key in one object under one storage key', () => {
      writeOpen('season:s1', true);
      writeOpen('division:s1:Competitive', false);

      expect(saved()).toEqual({ 'season:s1': true, 'division:s1:Competitive': false });
    });

    it('keeps the other entries when one changes', () => {
      writeOpen('season:s1', true);
      writeOpen('division:s1:Competitive', true);
      writeOpen('season:s1', false);

      expect(readOpen('division:s1:Competitive')).toBe(true);
      expect(readOpen('season:s1')).toBe(false);
    });

    it('forgets everything on clear', () => {
      writeOpen('season:s1', true);
      writeOpen('division:s1:Competitive', true);

      clearOpenState();

      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(readOpen('season:s1')).toBeUndefined();
      expect(readOpen('division:s1:Competitive')).toBeUndefined();
    });

    it('does not mistake the name of an object property for a saved entry', () => {
      writeOpen('season:s1', true);

      expect(readOpen('constructor')).toBeUndefined();
      expect(readOpen('toString')).toBeUndefined();
      expect(readOpen('__proto__')).toBeUndefined();
    });
  });

  describe('when the saved value is not what we wrote', () => {
    it.each([
      ['not JSON at all', '{not json'],
      ['an empty string', ''],
      ['null', 'null'],
      ['a number', '5'],
      ['a string', '"season:s1"'],
      ['a list', '[true, false]'],
    ])('reads nothing from %s, and the next write replaces it', (_label, raw) => {
      sessionStorage.setItem(STORAGE_KEY, raw);

      expect(readOpen('season:s1')).toBeUndefined();

      writeOpen('season:s1', true);
      expect(readOpen('season:s1')).toBe(true);
      expect(saved()).toEqual({ 'season:s1': true });
    });

    it('accepts only true and false as saved values', () => {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          'season:yes': true,
          'season:no': false,
          'season:text': 'true',
          'season:one': 1,
          'season:nothing': null,
          'season:object': { open: true },
        })
      );

      expect(readOpen('season:yes')).toBe(true);
      expect(readOpen('season:no')).toBe(false);
      expect(readOpen('season:text')).toBeUndefined();
      expect(readOpen('season:one')).toBeUndefined();
      expect(readOpen('season:nothing')).toBeUndefined();
      expect(readOpen('season:object')).toBeUndefined();
    });
  });

  describe('when the browser blocks storage', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };

    it('reads as if nothing was saved', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);

      expect(() => readOpen('season:s1')).not.toThrow();
      expect(readOpen('season:s1')).toBeUndefined();
    });

    it('lets a write fail without an error', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);

      expect(() => writeOpen('season:s1', true)).not.toThrow();
    });

    it('lets a clear fail without an error', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);

      expect(() => clearOpenState()).not.toThrow();
    });
  });
});
