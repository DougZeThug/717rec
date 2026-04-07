import { describe, it, expect } from 'vitest';
import { validateBracketData, validateMatchConnections } from '../bracketDataValidator';
import type { PlayoffMatch, PlayoffTeam } from '@/utils/playoffs/playoffTypes';

const makeTeam = (id: string): PlayoffTeam => ({ id, name: `Team ${id}` });

const makeMatch = (overrides: Partial<PlayoffMatch> = {}): PlayoffMatch => ({
  id: 'm1',
  round: 1,
  position: 1,
  team1Id: null,
  team2Id: null,
  winnerId: null,
  matchType: 'winners',
  bestOf: 3,
  bracket_id: 'b1',
  ...overrides,
});

describe('validateBracketData', () => {
  it('returns isValid:true for a fully valid bracket', () => {
    const teams = [makeTeam('t1'), makeTeam('t2')];
    const matches = [
      makeMatch({ id: 'm1', team1Id: 't1', team2Id: 't2', winnerId: 't1' }),
    ];
    const result = validateBracketData(matches, teams);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('errors when matches is not an array', () => {
    const result = validateBracketData(null as any, []);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Matches must be an array');
  });

  it('errors when teams is not an array', () => {
    const result = validateBracketData([], null as any);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Teams must be an array');
  });

  it('adds a warning (not error) when team1Id is unknown', () => {
    const teams = [makeTeam('t1')];
    const matches = [makeMatch({ team1Id: 'unknown' })];
    const result = validateBracketData(matches, teams);
    expect(result.isValid).toBe(true);
    expect(result.warnings.some((w) => w.includes('unknown team1Id'))).toBe(true);
  });

  it('adds a warning when team2Id is unknown', () => {
    const teams = [makeTeam('t1')];
    const matches = [makeMatch({ team2Id: 'unknown' })];
    const result = validateBracketData(matches, teams);
    expect(result.warnings.some((w) => w.includes('unknown team2Id'))).toBe(true);
  });

  it('errors when winnerId is not in teams', () => {
    const teams = [makeTeam('t1'), makeTeam('t2')];
    const matches = [makeMatch({ team1Id: 't1', team2Id: 't2', winnerId: 'ghost' })];
    const result = validateBracketData(matches, teams);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('invalid winnerId'))).toBe(true);
  });

  it('errors when winnerId is not one of the participating teams', () => {
    const teams = [makeTeam('t1'), makeTeam('t2'), makeTeam('t3')];
    const matches = [makeMatch({ team1Id: 't1', team2Id: 't2', winnerId: 't3' })];
    const result = validateBracketData(matches, teams);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('winnerId must be one of the participating teams'))).toBe(true);
  });

  it('warns when completed match has no winnerId', () => {
    const teams = [makeTeam('t1')];
    const matches = [makeMatch({ status: 'completed', winnerId: null })];
    const result = validateBracketData(matches, teams);
    expect(result.warnings.some((w) => w.includes('no winner'))).toBe(true);
  });

  it('warns when completed match is missing scores', () => {
    const teams = [makeTeam('t1'), makeTeam('t2')];
    const matches = [
      makeMatch({
        status: 'completed',
        team1Id: 't1',
        team2Id: 't2',
        winnerId: 't1',
        team1Score: null,
        team2Score: null,
      }),
    ];
    const result = validateBracketData(matches, teams);
    expect(result.warnings.some((w) => w.includes('missing scores'))).toBe(true);
  });

  it('errors when match is missing id', () => {
    const matches = [makeMatch({ id: '' })];
    const result = validateBracketData(matches, []);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('missing ID'))).toBe(true);
  });

  it('errors when match round is less than 1', () => {
    const matches = [makeMatch({ round: 0 })];
    const result = validateBracketData(matches, []);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('invalid round'))).toBe(true);
  });
});

describe('validateMatchConnections', () => {
  it('returns isValid:true for an empty match list', () => {
    const result = validateMatchConnections([]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns isValid:true when nextWinMatchId points to a real match', () => {
    const matches = [
      makeMatch({ id: 'm1', nextWinMatchId: 'm2' }),
      makeMatch({ id: 'm2' }),
    ];
    const result = validateMatchConnections(matches);
    expect(result.isValid).toBe(true);
  });

  it('errors when nextWinMatchId references a non-existent match', () => {
    const matches = [makeMatch({ id: 'm1', nextWinMatchId: 'ghost' })];
    const result = validateMatchConnections(matches);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('invalid nextWinMatchId'))).toBe(true);
  });

  it('errors when nextLoseMatchId references a non-existent match', () => {
    const matches = [makeMatch({ id: 'm1', nextLoseMatchId: 'ghost' })];
    const result = validateMatchConnections(matches);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('invalid nextLoseMatchId'))).toBe(true);
  });

  it('returns isValid:true when connections are null/undefined', () => {
    const matches = [makeMatch({ id: 'm1', nextWinMatchId: null, nextLoseMatchId: null })];
    const result = validateMatchConnections(matches);
    expect(result.isValid).toBe(true);
  });
});
