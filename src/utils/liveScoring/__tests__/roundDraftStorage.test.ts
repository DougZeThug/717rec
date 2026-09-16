import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearRoundDraft,
  loadRoundDraft,
  pruneRoundDrafts,
  saveRoundDraft,
} from '../roundDraftStorage';

const draft = {
  gameId: 'game-1',
  roundNumber: 3,
  team1: { score: 6, bagsIn: 2 },
  team2: { score: 0, bagsIn: undefined },
};

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('roundDraftStorage', () => {
  it('hands the tapped round back for the same game and round', () => {
    saveRoundDraft(draft);
    expect(loadRoundDraft('game-1', 3)).toEqual(draft);
  });

  it('keeps an unresolved bag count as unresolved rather than zero', () => {
    saveRoundDraft(draft);
    expect(loadRoundDraft('game-1', 3)?.team2.bagsIn).toBeUndefined();
  });

  it('offers nothing when no round was left behind', () => {
    expect(loadRoundDraft('game-1', 3)).toBeNull();
  });

  it('does not offer a draft under a round number that has moved on', () => {
    saveRoundDraft(draft);
    expect(loadRoundDraft('game-1', 4)).toBeNull();
  });

  it('does not offer one game a draft from another', () => {
    saveRoundDraft(draft);
    expect(loadRoundDraft('game-2', 3)).toBeNull();
  });

  it('forgets a draft older than twelve hours rather than resurrecting last week', () => {
    saveRoundDraft(draft);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 13 * 60 * 60 * 1000);

    expect(loadRoundDraft('game-1', 3)).toBeNull();
    expect(localStorage.getItem('liveRoundDraft:v2:game-1:3')).toBeNull();
  });

  it('drops a draft that is not readable', () => {
    localStorage.setItem('liveRoundDraft:v2:game-1:3', 'not json at all');
    expect(loadRoundDraft('game-1', 3)).toBeNull();
    expect(localStorage.getItem('liveRoundDraft:v2:game-1:3')).toBeNull();
  });

  it('drops a draft whose shape is wrong', () => {
    localStorage.setItem('liveRoundDraft:v2:game-1:3', JSON.stringify({ v: 2, gameId: 'game-1' }));
    expect(loadRoundDraft('game-1', 3)).toBeNull();
  });

  it('clears on request', () => {
    saveRoundDraft(draft);
    clearRoundDraft('game-1', 3);
    expect(loadRoundDraft('game-1', 3)).toBeNull();
  });

  it('gives up quietly when the browser refuses to store anything', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => saveRoundDraft(draft)).not.toThrow();
  });

  it('gives up quietly when the browser refuses to read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(loadRoundDraft('game-1', 3)).toBeNull();
  });

  it('keeps one round of a game without disturbing another', () => {
    saveRoundDraft(draft);
    saveRoundDraft({ ...draft, roundNumber: 4, team1: { score: 4, bagsIn: undefined } });

    expect(loadRoundDraft('game-1', 3)?.team1.score).toBe(6);
    expect(loadRoundDraft('game-1', 4)?.team1.score).toBe(4);
  });
});

describe('pruneRoundDrafts', () => {
  beforeEach(() => localStorage.clear());

  it('hands back a draft the release landed on top of, before collecting it', () => {
    // A scorer mid-round when the release ships reloads into a build that
    // reads a different key. Their taps are still under the old one, still
    // for this game and this round, and still fresh — dropping them is the
    // exact loss the copy exists to prevent.
    localStorage.setItem(
      'liveRoundDraft:v1:game-1',
      JSON.stringify({
        v: 1,
        gameId: 'game-1',
        roundNumber: 3,
        savedAt: Date.now(),
        team1: { score: 6, bagsIn: 2 },
        team2: { score: 0, bagsIn: null },
      })
    );

    expect(loadRoundDraft('game-1', 3)).toEqual(draft);
    // And it is moved across, so the next read does not depend on the old key.
    expect(localStorage.getItem('liveRoundDraft:v1:game-1')).toBeNull();
    expect(loadRoundDraft('game-1', 3)?.team1.score).toBe(6);
  });

  it('does not offer a pre-release draft for a round that has moved on', () => {
    localStorage.setItem(
      'liveRoundDraft:v1:game-1',
      JSON.stringify({
        v: 1,
        gameId: 'game-1',
        roundNumber: 3,
        savedAt: Date.now(),
        team1: { score: 6, bagsIn: 2 },
        team2: { score: 0, bagsIn: null },
      })
    );

    expect(loadRoundDraft('game-1', 4)).toBeNull();
    expect(localStorage.getItem('liveRoundDraft:v1:game-1')).toBeNull();
  });

  it('collects keys left by the one-slot-per-game scheme', () => {
    localStorage.setItem('liveRoundDraft:v1:game-1', JSON.stringify({ v: 1, gameId: 'game-1' }));
    saveRoundDraft(draft);

    pruneRoundDrafts();

    expect(localStorage.getItem('liveRoundDraft:v1:game-1')).toBeNull();
    expect(loadRoundDraft('game-1', 3)?.team1.score).toBe(6);
  });

  it('collects a draft past the twelve-hour cutoff', () => {
    saveRoundDraft(draft);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 13 * 60 * 60 * 1000);

    pruneRoundDrafts();

    expect(localStorage.getItem('liveRoundDraft:v2:game-1:3')).toBeNull();
  });

  it('leaves keys belonging to anything else alone', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('previousRankings', '[]');

    pruneRoundDrafts();

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('previousRankings')).toBe('[]');
  });

  it('never takes the draft the reader is about to hand back', () => {
    saveRoundDraft(draft);
    // A sweep that throws must not turn a readable draft into no draft.
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(loadRoundDraft('game-1', 3)?.team1.score).toBe(6);
  });
});
