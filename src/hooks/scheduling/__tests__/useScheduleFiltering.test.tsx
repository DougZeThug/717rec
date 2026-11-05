import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';

import { useScheduleFiltering } from '../useScheduleFiltering';

vi.mock('@/hooks/useDivisions', () => ({ useDivisions: () => ({ divisions: [] }) }));
vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({ activeMembership: null }),
}));

const makeMatch = (id: string, team1: string, team2: string, location?: string) =>
  ({
    id,
    team1Details: { name: team1 },
    team2Details: { name: team2 },
    location,
  }) as unknown as Match;

const MATCHES = [
  makeMatch('m1', 'Fake Team Alpha', 'Fake Team Bravo', 'Court 1'),
  makeMatch('m2', 'Fake Team Charlie', 'Fake Team Delta', 'Court 2'),
  makeMatch('m3', 'Fake Team Echo', 'Fake Team Alpha', 'Court 3'),
];

const search = (searchTerm: string) =>
  renderHook(() =>
    useScheduleFiltering({
      division: 'all',
      team: 'all',
      matches: MATCHES,
      searchTerm,
      groupedTimeslots: {},
    })
  ).result.current.filteredMatches.map((match) => match.id);

describe('useScheduleFiltering search', () => {
  it('finds matches by either team name, ignoring case', () => {
    expect(search('ALPHA')).toEqual(['m1', 'm3']);
    expect(search('delta')).toEqual(['m2']);
  });

  it('finds matches by location', () => {
    expect(search('court 2')).toEqual(['m2']);
  });

  it('finds the same matches with a space at the end as without one', () => {
    // A phone keyboard often adds a space after a word.
    expect(search('alpha ')).toEqual(search('alpha'));
    expect(search('alpha ')).toEqual(['m1', 'm3']);
  });

  it('finds the same matches with a space at the start as without one', () => {
    expect(search(' alpha')).toEqual(['m1', 'm3']);
    expect(search('  alpha  ')).toEqual(['m1', 'm3']);
  });

  it('counts a space inside the text', () => {
    expect(search('team alpha')).toEqual(['m1', 'm3']);
    expect(search('team  alpha')).toEqual([]);
  });

  it('treats spaces alone as no search at all', () => {
    expect(search('   ')).toEqual(['m1', 'm2', 'm3']);
    expect(search('')).toEqual(['m1', 'm2', 'm3']);
  });

  it('still finds nothing for text that matches nothing, with or without a trailing space', () => {
    expect(search('zzzz')).toEqual([]);
    expect(search('zzzz ')).toEqual([]);
  });
});
