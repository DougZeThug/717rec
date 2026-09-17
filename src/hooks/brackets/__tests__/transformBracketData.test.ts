import { describe, expect, it, vi } from 'vitest';

import { transformBracketsManagerData } from '../transformBracketData';

vi.mock('@/utils/logger', () => ({ bracketLog: vi.fn() }));

const baseInput = {
  bracket: {
    id: 'b-1',
    title: 'Summer Finals',
    format: 'Double Elimination',
    state: 'pending',
    division_id: 'd-1',
    divisions: { display_division: 'Competitive', name: 'Comp A' },
  },
  stageId: 7,
  participants: [],
  groups: [],
  rounds: [],
  matches: [],
  teamDetails: [],
};

describe('transformBracketsManagerData', () => {
  it('carries the division id through', () => {
    const result = transformBracketsManagerData(baseInput);

    // The dialog that re-files a bracket needs the id, not the display name.
    // Dropping it here made a rename clear the bracket's division.
    expect(result.divisionId).toBe('d-1');
  });

  it('keeps the display name separate from the id', () => {
    const result = transformBracketsManagerData(baseInput);

    expect(result.division).toBe('Competitive');
    expect(result.divisionId).toBe('d-1');
  });

  it('reports a missing division id as null rather than undefined', () => {
    const result = transformBracketsManagerData({
      ...baseInput,
      bracket: { ...baseInput.bracket, division_id: null },
    });

    expect(result.divisionId).toBeNull();
  });

  it('carries the season id through, so a link to a bracket can select its season', () => {
    const result = transformBracketsManagerData({
      ...baseInput,
      bracket: { ...baseInput.bracket, season_id: 's-past' },
    });

    expect(result.seasonId).toBe('s-past');
  });

  it('reports a missing season id as null rather than undefined', () => {
    const result = transformBracketsManagerData(baseInput);

    expect(result.seasonId).toBeNull();
  });

  it('resolves teams by team_id, so a rename does not strand a match', () => {
    const result = transformBracketsManagerData({
      ...baseInput,
      participants: [
        { id: 1, name: 'Old Name', position: 1, team_id: 't-1', tournament_id: 'b-1' },
        { id: 2, name: 'Bravo', position: 2, team_id: 't-2', tournament_id: 'b-1' },
      ],
      groups: [{ id: 10, number: 1, stage_id: 7 }],
      rounds: [
        { id: 1295, group_id: 10, number: 1 },
        { id: 1296, group_id: 10, number: 2 },
      ],
      matches: [
        {
          id: 100,
          opponent1_id: 1,
          opponent2_id: 2,
          opponent1_result: 'win',
          opponent2_result: 'loss',
          opponent1_score: 21,
          opponent2_score: 15,
          status: 4,
          group_id: 10,
          round_id: 1296,
          number: 1,
        },
      ],
      teamDetails: [
        { id: 't-1', name: 'Renamed Alpha', image_url: 'alpha.png' },
        { id: 't-2', name: 'Bravo', image_url: 'bravo.png' },
      ],
    });

    expect(result.matches).toHaveLength(1);
    const [match] = result.matches;
    // The canonical team name wins over the participant's stored snapshot.
    expect(match.team1Name).toBe('Renamed Alpha');
    expect(match.winnerId).toBe('t-1');
    expect(match.team1Score).toBe(21);
    expect(match.team2Score).toBe(15);
    // round_id points at the round table's global id; the number on screen is
    // that row's `number`.
    expect(match.round).toBe(2);
    expect(match.status).toBe('completed');
    expect(match.matchType).toBe('winners');

    expect(result.participants?.[0]).toMatchObject({
      position: 1,
      team_id: 't-1',
      name: 'Renamed Alpha',
    });
  });

  it('leaves a match with no opponents unresolved rather than guessing', () => {
    const result = transformBracketsManagerData({
      ...baseInput,
      groups: [{ id: 10, number: 2, stage_id: 7 }],
      matches: [
        {
          id: 101,
          opponent1_id: null,
          opponent2_id: null,
          opponent1_result: null,
          opponent2_result: null,
          opponent1_score: null,
          opponent2_score: null,
          status: 2,
          group_id: 10,
          round_id: 1,
          number: 1,
        },
      ],
    });

    const [match] = result.matches;
    expect(match.team1Id).toBeNull();
    expect(match.winnerId).toBeNull();
    expect(match.matchType).toBe('losers');
    expect(match.status).toBe('ready');
  });

  it('falls back to the participant name when no team row is linked', () => {
    const result = transformBracketsManagerData({
      ...baseInput,
      participants: [
        { id: 1, name: 'Unlinked Team', position: 1, team_id: null, tournament_id: 'b-1' },
      ],
    });

    expect(result.participants?.[0]).toMatchObject({ team_id: '', name: 'Unlinked Team' });
  });

  describe('the round number', () => {
    // round.id is a global counter shared by every bracket in the database, so a
    // real bracket's ids look like 1295/1296, not 0/1. round.number is the value
    // a reader should see, and it restarts at 1 in each half of the bracket.
    const rounds = [
      { id: 1295, group_id: 10, number: 1 },
      { id: 1296, group_id: 10, number: 2 },
      { id: 1300, group_id: 20, number: 1 },
    ];

    const matchIn = (groupId: number, roundId: number) => ({
      id: 200,
      opponent1_id: null,
      opponent2_id: null,
      opponent1_result: null,
      opponent2_result: null,
      opponent1_score: null,
      opponent2_score: null,
      status: 2,
      group_id: groupId,
      round_id: roundId,
      number: 1,
    });

    it('comes from the round table, not from round_id', () => {
      const result = transformBracketsManagerData({
        ...baseInput,
        groups: [{ id: 10, number: 1, stage_id: 7 }],
        rounds,
        matches: [matchIn(10, 1296)],
      });

      // Deriving it from the id gave 1297 here.
      expect(result.matches[0].round).toBe(2);
    });

    it('restarts at 1 in the losers bracket', () => {
      const result = transformBracketsManagerData({
        ...baseInput,
        groups: [{ id: 20, number: 2, stage_id: 7 }],
        rounds,
        matches: [matchIn(20, 1300)],
      });

      const [match] = result.matches;
      expect(match.matchType).toBe('losers');
      // A higher id than either winners round, but still round 1 in its own half.
      expect(match.round).toBe(1);
    });

    it('falls back to 1 when the round row is missing', () => {
      const result = transformBracketsManagerData({
        ...baseInput,
        groups: [{ id: 10, number: 1, stage_id: 7 }],
        rounds,
        matches: [matchIn(10, 9999)],
      });

      // The same fallback the sync_match_to_playoff_matches trigger uses.
      expect(result.matches[0].round).toBe(1);
    });
  });
});
