import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearRoundDraft, loadRoundDraft, saveRoundDraft } from '../roundDraftStorage';

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
    expect(localStorage.getItem('liveRoundDraft:v1:game-1')).toBeNull();
  });

  it('drops a draft that is not readable', () => {
    localStorage.setItem('liveRoundDraft:v1:game-1', 'not json at all');
    expect(loadRoundDraft('game-1', 3)).toBeNull();
    expect(localStorage.getItem('liveRoundDraft:v1:game-1')).toBeNull();
  });

  it('drops a draft whose shape is wrong', () => {
    localStorage.setItem('liveRoundDraft:v1:game-1', JSON.stringify({ v: 1, gameId: 'game-1' }));
    expect(loadRoundDraft('game-1', 3)).toBeNull();
  });

  it('clears on request', () => {
    saveRoundDraft(draft);
    clearRoundDraft('game-1');
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
});
