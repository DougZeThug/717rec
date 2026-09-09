import { describe, expect, it } from 'vitest';

import { MATCH_STATUS_LABELS } from '@/types/matchStatus';

import { deriveMatchStatus, isMatchCompleted, isMatchOpenForScoring } from '../matchStatus';

describe('deriveMatchStatus', () => {
  it('calls a match with a recorded result completed', () => {
    expect(deriveMatchStatus({ iscompleted: true })).toBe('completed');
  });

  it('calls a match with no result scheduled', () => {
    expect(deriveMatchStatus({ iscompleted: false })).toBe('scheduled');
  });

  it('treats a null iscompleted as not finished, so the match stays visible', () => {
    expect(deriveMatchStatus({ iscompleted: null })).toBe('scheduled');
  });

  it('treats a missing iscompleted as not finished', () => {
    expect(deriveMatchStatus({})).toBe('scheduled');
  });

  it('reads the postponed state from status', () => {
    expect(deriveMatchStatus({ iscompleted: false, status: 'postponed' })).toBe('postponed');
  });

  it('reads the canceled state from status', () => {
    expect(deriveMatchStatus({ iscompleted: false, status: 'canceled' })).toBe('canceled');
  });

  it('ignores a null status', () => {
    expect(deriveMatchStatus({ iscompleted: false, status: null })).toBe('scheduled');
  });

  it('lets a recorded result win over postponed, because a postponed match can still be played', () => {
    expect(deriveMatchStatus({ iscompleted: true, status: 'postponed' })).toBe('completed');
  });

  it('lets canceled win over postponed, because a called-off match is not merely late', () => {
    expect(deriveMatchStatus({ iscompleted: null, status: 'canceled' })).toBe('canceled');
  });
});

describe('isMatchCompleted', () => {
  it('is true only for a recorded result', () => {
    expect(isMatchCompleted({ iscompleted: true })).toBe(true);
    expect(isMatchCompleted({ iscompleted: false })).toBe(false);
    expect(isMatchCompleted({ iscompleted: null })).toBe(false);
  });

  it('is false for a canceled match that was never played', () => {
    expect(isMatchCompleted({ iscompleted: false, status: 'canceled' })).toBe(false);
  });
});

describe('isMatchOpenForScoring', () => {
  it('is true for a match that still needs a score', () => {
    expect(isMatchOpenForScoring({ iscompleted: false })).toBe(true);
    expect(isMatchOpenForScoring({ iscompleted: null })).toBe(true);
  });

  it('is false once a result is recorded', () => {
    expect(isMatchOpenForScoring({ iscompleted: true })).toBe(false);
  });

  it('is false for postponed and canceled matches, so they leave every score queue', () => {
    expect(isMatchOpenForScoring({ iscompleted: false, status: 'postponed' })).toBe(false);
    expect(isMatchOpenForScoring({ iscompleted: false, status: 'canceled' })).toBe(false);
  });
});

describe('MATCH_STATUS_LABELS', () => {
  it('gives every state exactly one word', () => {
    const labels = Object.values(MATCH_STATUS_LABELS);
    expect(labels).toHaveLength(new Set(labels).size);
  });

  it('has a word for every state deriveMatchStatus can return', () => {
    expect(MATCH_STATUS_LABELS[deriveMatchStatus({ iscompleted: true })]).toBe('Final');
    expect(MATCH_STATUS_LABELS[deriveMatchStatus({ iscompleted: false })]).toBe('Upcoming');
    expect(MATCH_STATUS_LABELS[deriveMatchStatus({ status: 'postponed' })]).toBe('Postponed');
    expect(MATCH_STATUS_LABELS[deriveMatchStatus({ status: 'canceled' })]).toBe('Canceled');
  });
});
