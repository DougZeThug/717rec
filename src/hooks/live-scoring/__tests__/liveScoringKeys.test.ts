import { describe, expect, it } from 'vitest';

import { liveScoringKeys } from '../liveScoringKeys';

describe('liveScoringKeys', () => {
  it('names the round save by match, so it can be found while parked offline', () => {
    expect(liveScoringKeys.submitRound('m1')).toEqual(['live-round-save', 'm1']);
  });

  it('keeps the other keys per match, team and season', () => {
    expect(liveScoringKeys.liveMatch('m1')).toEqual(['live-match', 'm1']);
    expect(liveScoringKeys.teamPlayers('t1')).toEqual(['team-players', 't1']);
    expect(liveScoringKeys.teamPlayerSeasonStats('t1', 's1')).toEqual([
      'player-season-stats',
      't1',
      's1',
    ]);
  });
});
