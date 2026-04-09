import { describe, expect, it } from 'vitest';

import {
  calculateDivisionRecords,
  categorizeDivision,
  getTierFromWeight,
} from '../calculateDivisionRecords';
import { ArchivedMatchData, MatchData, PlayoffMatchData } from '../types';

describe('categorizeDivision', () => {
  it('returns null for null input', () => {
    expect(categorizeDivision(null)).toBeNull();
  });

  it('categorizes competitive divisions', () => {
    expect(categorizeDivision('Competitive')).toBe('competitive');
    expect(categorizeDivision('competitive division')).toBe('competitive');
    expect(categorizeDivision('Hidden')).toBeNull();
  });

  it('categorizes intermediate divisions', () => {
    expect(categorizeDivision('Intermediate')).toBe('intermediate');
    expect(categorizeDivision('Intermediate High')).toBe('intermediate');
    expect(categorizeDivision('Cuspers')).toBe('intermediate');
  });

  it('categorizes recreational divisions', () => {
    expect(categorizeDivision('Recreational')).toBe('recreational');
    expect(categorizeDivision('recreational low')).toBe('recreational');
  });

  it('returns null for unknown divisions', () => {
    expect(categorizeDivision('Unknown Division')).toBeNull();
    expect(categorizeDivision('Premier')).toBeNull();
  });
});

describe('getTierFromWeight', () => {
  it('returns competitive for weight >= 0.89', () => {
    expect(getTierFromWeight(1.0)).toBe('competitive');
    expect(getTierFromWeight(0.9)).toBe('competitive');
    expect(getTierFromWeight(0.89)).toBe('competitive');
  });

  it('returns intermediate for weight >= 0.40 and < 0.89', () => {
    expect(getTierFromWeight(0.88)).toBe('intermediate');
    expect(getTierFromWeight(0.7)).toBe('intermediate');
    expect(getTierFromWeight(0.4)).toBe('intermediate');
  });

  it('returns recreational for weight < 0.40', () => {
    expect(getTierFromWeight(0.39)).toBe('recreational');
    expect(getTierFromWeight(0.25)).toBe('recreational');
    expect(getTierFromWeight(0)).toBe('recreational');
  });
});

describe('calculateDivisionRecords', () => {
  const teamId = 'team-1';

  it('returns zeros when no matches', () => {
    const result = calculateDivisionRecords({
      currentMatches: null,
      archivedMatches: null,
      playoffMatches: null,
      teamDivisionMap: new Map(),
      bracketDivisionWeights: {},
      bracketDivisionDisplayNames: {},
      teamId,
    });

    expect(result).toEqual({
      competitive: { wins: 0, losses: 0 },
      intermediate: { wins: 0, losses: 0 },
      recreational: { wins: 0, losses: 0 },
    });
  });

  it('counts wins against competitive teams', () => {
    const currentMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 0,
        season_id: 'season-1',
        team2: { id: 'team-2', divisions: { name: 'Competitive' } },
      },
    ];

    const result = calculateDivisionRecords({
      currentMatches,
      archivedMatches: null,
      playoffMatches: null,
      teamDivisionMap: new Map(),
      bracketDivisionWeights: {},
      bracketDivisionDisplayNames: {},
      teamId,
    });

    expect(result.competitive.wins).toBe(1);
    expect(result.competitive.losses).toBe(0);
  });

  it('counts losses against intermediate teams', () => {
    const currentMatches: MatchData[] = [
      {
        winner_id: 'team-2',
        loser_id: 'team-1',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 1,
        team2_game_wins: 2,
        season_id: 'season-1',
        team2: { id: 'team-2', divisions: { name: 'Intermediate' } },
      },
    ];

    const result = calculateDivisionRecords({
      currentMatches,
      archivedMatches: null,
      playoffMatches: null,
      teamDivisionMap: new Map(),
      bracketDivisionWeights: {},
      bracketDivisionDisplayNames: {},
      teamId,
    });

    expect(result.intermediate.wins).toBe(0);
    expect(result.intermediate.losses).toBe(1);
  });

  it('looks up opponent division from archived matches using map', () => {
    const archivedMatches: ArchivedMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 0,
        season_id: 'season-old',
      },
    ];

    const teamDivisionMap = new Map<string, string>();
    teamDivisionMap.set('team-2_season-old', 'Recreational');

    const result = calculateDivisionRecords({
      currentMatches: null,
      archivedMatches,
      playoffMatches: null,
      teamDivisionMap,
      bracketDivisionWeights: {},
      bracketDivisionDisplayNames: {},
      teamId,
    });

    expect(result.recreational.wins).toBe(1);
  });

  it('categorizes playoff matches by bracket display division name', () => {
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 0,
        bracket_id: 'comp-bracket',
      },
      {
        winner_id: 'team-1',
        loser_id: 'team-3',
        team1_id: 'team-1',
        team2_id: 'team-3',
        team1_score: 2,
        team2_score: 1,
        bracket_id: 'rec-bracket',
      },
    ];

    const result = calculateDivisionRecords({
      currentMatches: null,
      archivedMatches: null,
      playoffMatches,
      teamDivisionMap: new Map(),
      bracketDivisionWeights: {},
      bracketDivisionDisplayNames: {
        'comp-bracket': 'Competitive',
        'rec-bracket': 'Recreational',
      },
      teamId,
    });

    expect(result.competitive.wins).toBe(1);
    expect(result.recreational.wins).toBe(1);
  });

  it('correctly categorizes Recreational High playoff bracket as recreational', () => {
    // Regression: weight=0.50 previously mapped to intermediate via getTierFromWeight
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 0,
        bracket_id: 'rec-high-bracket',
      },
    ];

    const result = calculateDivisionRecords({
      currentMatches: null,
      archivedMatches: null,
      playoffMatches,
      teamDivisionMap: new Map(),
      bracketDivisionWeights: { 'rec-high-bracket': 0.5 },
      bracketDivisionDisplayNames: { 'rec-high-bracket': 'Recreational' },
      teamId,
    });

    expect(result.recreational.wins).toBe(1);
    expect(result.intermediate.wins).toBe(0);
  });

  it('correctly categorizes cuspers playoff bracket as intermediate', () => {
    // Regression: weight=0.90 previously mapped to competitive via getTierFromWeight
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 0,
        bracket_id: 'cuspers-bracket',
      },
    ];

    const result = calculateDivisionRecords({
      currentMatches: null,
      archivedMatches: null,
      playoffMatches,
      teamDivisionMap: new Map(),
      bracketDivisionWeights: { 'cuspers-bracket': 0.9 },
      bracketDivisionDisplayNames: { 'cuspers-bracket': 'cuspers' },
      teamId,
    });

    expect(result.intermediate.wins).toBe(1);
    expect(result.competitive.wins).toBe(0);
  });

  it('skips playoff matches without bracket_id', () => {
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 0,
        bracket_id: null,
      },
    ];

    const result = calculateDivisionRecords({
      currentMatches: null,
      archivedMatches: null,
      playoffMatches,
      teamDivisionMap: new Map(),
      bracketDivisionWeights: {},
      bracketDivisionDisplayNames: {},
      teamId,
    });

    expect(result.competitive.wins).toBe(0);
    expect(result.intermediate.wins).toBe(0);
    expect(result.recreational.wins).toBe(0);
  });
});
