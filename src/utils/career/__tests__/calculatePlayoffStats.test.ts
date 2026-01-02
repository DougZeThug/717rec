
import { describe, it, expect } from 'vitest';
import { calculatePlayoffStats } from '../calculatePlayoffStats';
import { PlayoffMatchData } from '../types';

describe('calculatePlayoffStats', () => {
  const teamId = 'team-1';

  it('returns zeros when no playoff matches', () => {
    const result = calculatePlayoffStats({
      playoffMatches: null,
      bracketDivisionWeights: {},
      teamId
    });

    expect(result).toEqual({
      career_playoff_wins: 0,
      career_playoff_losses: 0,
      competitive_playoff_wins: 0
    });
  });

  it('returns zeros with empty playoff matches', () => {
    const result = calculatePlayoffStats({
      playoffMatches: [],
      bracketDivisionWeights: {},
      teamId
    });

    expect(result).toEqual({
      career_playoff_wins: 0,
      career_playoff_losses: 0,
      competitive_playoff_wins: 0
    });
  });

  it('counts playoff wins correctly', () => {
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 1,
        bracket_id: 'bracket-1'
      },
      {
        winner_id: 'team-1',
        loser_id: 'team-3',
        team1_id: 'team-3',
        team2_id: 'team-1',
        team1_score: 0,
        team2_score: 2,
        bracket_id: 'bracket-1'
      }
    ];

    const result = calculatePlayoffStats({
      playoffMatches,
      bracketDivisionWeights: { 'bracket-1': 0.7 },
      teamId
    });

    expect(result.career_playoff_wins).toBe(2);
    expect(result.career_playoff_losses).toBe(0);
  });

  it('counts playoff losses correctly', () => {
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-2',
        loser_id: 'team-1',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 1,
        team2_score: 2,
        bracket_id: 'bracket-1'
      }
    ];

    const result = calculatePlayoffStats({
      playoffMatches,
      bracketDivisionWeights: { 'bracket-1': 0.7 },
      teamId
    });

    expect(result.career_playoff_wins).toBe(0);
    expect(result.career_playoff_losses).toBe(1);
  });

  it('detects competitive division wins (weight >= 0.89)', () => {
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 0,
        bracket_id: 'competitive-bracket'
      },
      {
        winner_id: 'team-1',
        loser_id: 'team-3',
        team1_id: 'team-1',
        team2_id: 'team-3',
        team1_score: 2,
        team2_score: 1,
        bracket_id: 'intermediate-bracket'
      }
    ];

    const result = calculatePlayoffStats({
      playoffMatches,
      bracketDivisionWeights: {
        'competitive-bracket': 1.0,  // Competitive
        'intermediate-bracket': 0.7  // Not competitive
      },
      teamId
    });

    expect(result.career_playoff_wins).toBe(2);
    expect(result.competitive_playoff_wins).toBe(1);
  });

  it('uses default weight 0.85 for unknown brackets', () => {
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 0,
        bracket_id: 'unknown-bracket'
      }
    ];

    const result = calculatePlayoffStats({
      playoffMatches,
      bracketDivisionWeights: {},  // No weights provided
      teamId
    });

    // Default 0.85 < 0.89, so not competitive
    expect(result.career_playoff_wins).toBe(1);
    expect(result.competitive_playoff_wins).toBe(0);
  });

  it('handles match with null bracket_id', () => {
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 0,
        bracket_id: null
      }
    ];

    const result = calculatePlayoffStats({
      playoffMatches,
      bracketDivisionWeights: {},
      teamId
    });

    expect(result.career_playoff_wins).toBe(1);
  });
});
