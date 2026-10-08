import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { AutoScheduleMatch, Team } from '@/types';
import { ALL_BLOCK_TIMES } from '@/utils/autoSchedule/constants';

import EditableMatchList from '../EditableMatchList';

const teams = [
  { id: 't1', name: 'Alpha', imageUrl: null },
  { id: 't2', name: 'Bravo', imageUrl: null },
  { id: 't3', name: 'Charlie', imageUrl: null },
  { id: 't4', name: 'Delta', imageUrl: null },
] as unknown as Team[];

const handlers = {
  onUpdateTeam: vi.fn(),
  onUpdateTimeslot: vi.fn(),
  onSwapTeams: vi.fn(),
  onRemove: vi.fn(),
};

const matches: AutoScheduleMatch[] = [
  {
    id: 'm1',
    team1Id: 't1',
    team2Id: 't2',
    timeslot: ALL_BLOCK_TIMES[0],
    date: new Date('2026-09-17'),
  },
  {
    id: 'm2',
    team1Id: 't3',
    team2Id: 't4',
    timeslot: ALL_BLOCK_TIMES[1],
    date: new Date('2026-09-17'),
  },
];

describe('EditableMatchList', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('says there is nothing to edit when there are no matches', () => {
    render(<EditableMatchList matches={[]} teams={teams} validation={null} {...handlers} />);

    expect(screen.getByText('No matches to edit')).toBeInTheDocument();
  });

  it('groups matches under one heading per timeslot', () => {
    render(<EditableMatchList matches={matches} teams={teams} validation={null} {...handlers} />);

    const headings = screen.getAllByRole('heading', { level: 4 });
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent('(1 match)');
    expect(headings[1]).toHaveTextContent('(1 match)');
    expect(screen.getAllByLabelText('Team 1')).toHaveLength(2);
  });

  it('shows a clean summary when the schedule is valid', () => {
    render(
      <EditableMatchList
        matches={matches}
        teams={teams}
        validation={{ isValid: true, errors: [], warnings: [] }}
        {...handlers}
      />
    );

    expect(screen.getByText('Schedule is valid with no conflicts')).toBeInTheDocument();
  });
});
