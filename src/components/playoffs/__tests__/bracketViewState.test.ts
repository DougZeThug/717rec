import { describe, expect, it } from 'vitest';

import { resolveBracketViewState } from '../bracketViewState';

const base = {
  bracketId: 'bracket-1',
  isLoading: false,
  error: null as unknown,
  hasLegacyBracket: false,
  isJsonbBracket: undefined as unknown,
  displayBracket: { id: 'b', matches: [] } as object | null | undefined,
};

const resolve = (overrides: Partial<typeof base> = {}) =>
  resolveBracketViewState({ ...base, ...overrides });

describe('resolveBracketViewState', () => {
  it('is ready for a bracket with a matches array', () => {
    expect(resolve({ displayBracket: { id: 'b', matches: [1, 2, 3] } })).toEqual({
      kind: 'ready',
      matchesCount: 3,
    });
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
  ])('is invalid-id for a %s id, before anything else', (_label, bracketId) => {
    expect(
      resolve({ bracketId, isLoading: true, error: new Error('x'), displayBracket: null })
    ).toEqual({ kind: 'invalid-id' });
  });

  describe('loading', () => {
    it('is loading while data loads and nothing can be shown yet', () => {
      expect(resolve({ isLoading: true, displayBracket: null })).toEqual({ kind: 'loading' });
    });

    it('is loading before error', () => {
      expect(resolve({ isLoading: true, error: new Error('x'), displayBracket: null })).toEqual({
        kind: 'loading',
      });
    });

    it.each([
      ['a bracket prop', { hasLegacyBracket: true }],
      ['a JSONB bracket', { isJsonbBracket: { stage: 1 } }],
    ])('is not loading when there is %s', (_label, overrides) => {
      expect(resolve({ isLoading: true, ...overrides }).kind).toBe('ready');
    });
  });

  describe('error', () => {
    it('is error when loading failed and nothing can be shown', () => {
      expect(resolve({ error: new Error('x'), displayBracket: null })).toEqual({ kind: 'error' });
    });

    it('is error even when a fetched bracket exists', () => {
      expect(resolve({ error: new Error('x') })).toEqual({ kind: 'error' });
    });

    it.each([
      ['a bracket prop', { hasLegacyBracket: true }],
      ['a JSONB bracket', { isJsonbBracket: { stage: 1 } }],
    ])('is not an error when there is %s', (_label, overrides) => {
      expect(resolve({ error: new Error('x'), ...overrides }).kind).toBe('ready');
    });
  });

  describe('empty', () => {
    it.each([null, undefined])('is empty when the display bracket is %s', (displayBracket) => {
      expect(resolve({ displayBracket })).toEqual({ kind: 'empty' });
    });
  });

  describe('corrupt', () => {
    it.each([
      ['no matches key', { id: 'b' }, undefined],
      ['a string', { id: 'b', matches: 'nope' }, 'nope'],
      ['null', { id: 'b', matches: null }, null],
      ['an object', { id: 'b', matches: {} }, {}],
    ])('is corrupt when matches is %s', (_label, displayBracket, matches) => {
      expect(resolve({ displayBracket })).toEqual({ kind: 'corrupt', matches });
    });

    it('does not check matches for a JSONB bracket', () => {
      expect(resolve({ isJsonbBracket: { stage: 1 }, displayBracket: { id: 'b' } })).toEqual({
        kind: 'ready',
        matchesCount: 0,
      });
    });
  });

  describe('matches count', () => {
    it('is 0 for an empty list', () => {
      expect(resolve({ displayBracket: { id: 'b', matches: [] } })).toEqual({
        kind: 'ready',
        matchesCount: 0,
      });
    });

    it('is the number of matches', () => {
      expect(resolve({ displayBracket: { id: 'b', matches: ['a'] } })).toEqual({
        kind: 'ready',
        matchesCount: 1,
      });
    });
  });
});
