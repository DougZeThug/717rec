import { describe, it, expect } from 'vitest';
import {
  createTeamMap,
  getTeamById,
  createPlaceholderTeam,
  validateTeamData,
  normalizeTeamsForDisplay,
} from '../teamMapper';
import type { PlayoffTeam } from '@/utils/playoffs/playoffTypes';

const makeTeam = (id: string, name: string, overrides: Partial<PlayoffTeam> = {}): PlayoffTeam => ({
  id,
  name,
  logo_url: null,
  image_url: null,
  ...overrides,
});

describe('createTeamMap', () => {
  it('creates a Map keyed by team id', () => {
    const teams = [makeTeam('t1', 'Tigers'), makeTeam('t2', 'Lions')];
    const map = createTeamMap(teams);
    expect(map.size).toBe(2);
    expect(map.get('t1')).toEqual(teams[0]);
    expect(map.get('t2')).toEqual(teams[1]);
  });

  it('returns empty Map for empty array', () => {
    const map = createTeamMap([]);
    expect(map.size).toBe(0);
  });
});

describe('getTeamById', () => {
  const teams = [makeTeam('abc', 'Eagles')];
  const teamMap = createTeamMap(teams);

  it('returns the team when found', () => {
    expect(getTeamById('abc', teamMap)).toEqual(teams[0]);
  });

  it('returns null when teamId is null', () => {
    expect(getTeamById(null, teamMap)).toBeNull();
  });

  it('returns null when team not found and placeholders disabled', () => {
    expect(getTeamById('unknown', teamMap)).toBeNull();
  });

  it('returns a placeholder team when team not found and includePlaceholders is true', () => {
    const result = getTeamById('unknown-id', teamMap, { includePlaceholders: true });
    if (!result) throw new Error('Expected placeholder team but got null');
    expect(result.id).toBe('unknown-id');
    expect(result.name).toContain('Team');
  });

  it('uses custom placeholderPrefix when provided', () => {
    const result = getTeamById('xyz', teamMap, {
      includePlaceholders: true,
      placeholderPrefix: 'Bye',
    });
    if (!result) throw new Error('Expected placeholder team but got null');
    expect(result.name).toMatch(/^Bye /);
  });
});

describe('createPlaceholderTeam', () => {
  it('uses default "Team" prefix and first 8 chars of id', () => {
    const id = '12345678-abcd-efgh';
    const team = createPlaceholderTeam(id);
    expect(team.id).toBe(id);
    expect(team.name).toBe(`Team ${id.substring(0, 8)}`);
    expect(team.logo_url).toBeNull();
    expect(team.image_url).toBeNull();
  });

  it('uses custom prefix', () => {
    const id = 'abcdefgh-1234';
    const team = createPlaceholderTeam(id, 'TBD');
    expect(team.name).toBe(`TBD ${id.substring(0, 8)}`);
  });
});

describe('validateTeamData', () => {
  it('puts all valid teams in valid array', () => {
    const teams = [makeTeam('t1', 'Tigers'), makeTeam('t2', 'Lions')];
    const { valid, invalid } = validateTeamData(teams);
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(0);
  });

  it('separates invalid entries (null, missing id, missing name)', () => {
    const validTeam = makeTeam('t1', 'Tigers');
    const noId = { name: 'No ID' } as unknown as PlayoffTeam;
    const noName = { id: 't3' } as unknown as PlayoffTeam;
    const nullEntry = null as unknown as PlayoffTeam;

    const { valid, invalid } = validateTeamData([validTeam, noId, noName, nullEntry]);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toEqual(validTeam);
    expect(invalid).toHaveLength(3);
  });

  it('returns empty arrays for empty input', () => {
    const { valid, invalid } = validateTeamData([]);
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(0);
  });
});

describe('normalizeTeamsForDisplay', () => {
  it('preserves team name when already set', () => {
    const teams = [makeTeam('t1', 'Tigers')];
    const result = normalizeTeamsForDisplay(teams);
    expect(result[0].name).toBe('Tigers');
  });

  it('falls back to "Team <id prefix>" when name is empty', () => {
    const team: PlayoffTeam = { id: 'abcdefgh-rest', name: '' };
    const result = normalizeTeamsForDisplay([team]);
    expect(result[0].name).toBe(`Team ${'abcdefgh-rest'.substring(0, 8)}`);
  });

  it('sets logo_url and image_url to null when not provided', () => {
    const team: PlayoffTeam = { id: 't1', name: 'Tigers' };
    const result = normalizeTeamsForDisplay([team]);
    expect(result[0].logo_url).toBeNull();
    expect(result[0].image_url).toBeNull();
  });

  it('preserves existing logo_url and image_url', () => {
    const team = makeTeam('t1', 'Tigers', { logo_url: 'http://logo.png', image_url: 'http://img.png' });
    const result = normalizeTeamsForDisplay([team]);
    expect(result[0].logo_url).toBe('http://logo.png');
    expect(result[0].image_url).toBe('http://img.png');
  });
});
