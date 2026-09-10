import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlayoffBracket } from '@/types';

import BracketList from '../BracketList';

const mockUseProjectedSeeds = vi.fn();

vi.mock('@/hooks/playoffs/useProjectedSeeds', () => ({
  useProjectedSeeds: (seasonId: string | null) => mockUseProjectedSeeds(seasonId),
}));

vi.mock('@/utils/logger', () => ({ bracketLog: vi.fn() }));

const bracket = (id: string, division: string): PlayoffBracket =>
  ({
    id,
    name: `Bracket ${id}`,
    format: 'Double Elimination',
    division,
    state: 'in_progress',
    uses_brackets_manager: true,
  }) as unknown as PlayoffBracket;

const renderList = (props: Partial<React.ComponentProps<typeof BracketList>> = {}) =>
  render(
    <MemoryRouter>
      <BracketList
        divisions={['Competitive', 'Intermediate']}
        bracketsByDivision={{}}
        onViewBracket={vi.fn()}
        isLoading={false}
        seasonId="season-active"
        {...props}
      />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockUseProjectedSeeds.mockReturnValue({
    seedsByDivision: {
      Competitive: [{ seed: 1, teamId: 'a', teamName: 'Bag Ass Bandits', powerScore: 91.2 }],
      Intermediate: [{ seed: 1, teamId: 'b', teamName: 'Cuzzo Crew', powerScore: 74.5 }],
    },
    finalWeek: 10,
    isReady: true,
  });
});

describe('BracketList', () => {
  it('shows placeholders while the brackets load', () => {
    const { container } = renderList({ isLoading: true });

    expect(container.querySelectorAll('.rounded-xl')).toHaveLength(3);
    expect(screen.queryByText(/Division/)).not.toBeInTheDocument();
  });

  it('replaces the whole list when the league has no divisions', () => {
    renderList({ divisions: [] });

    expect(screen.getByText('No Playoff Brackets Yet')).toBeInTheDocument();
    expect(screen.getByText(/Check back during playoff season/)).toBeInTheDocument();
  });

  it('invites an admin to create the first bracket when there are no divisions', () => {
    renderList({ divisions: [], onCreateBracket: vi.fn() });

    expect(screen.getByRole('button', { name: /create first bracket/i })).toBeInTheDocument();
    expect(screen.getByText(/creating your first playoff bracket/)).toBeInTheDocument();
  });

  it('shows projected seeds in every division that has no bracket yet', () => {
    renderList();

    expect(screen.getByRole('list', { name: 'Competitive projected seeds' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Intermediate projected seeds' })).toBeInTheDocument();
    expect(screen.queryByText('No brackets yet for this division')).not.toBeInTheDocument();
  });

  it('never mounts the seeds behind a division that already has a bracket', () => {
    renderList({
      divisions: ['Competitive'],
      bracketsByDivision: { Competitive: [bracket('b1', 'Competitive')] },
    });

    // The whole point of passing the seeds as a slot: no empty division, no hook,
    // so none of the three ranking queries behind it are ever issued.
    expect(mockUseProjectedSeeds).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'View Live Bracket' })).toBeInTheDocument();
  });

  it('leaves the old sentence alone when no season is passed', () => {
    mockUseProjectedSeeds.mockReturnValue({
      seedsByDivision: {},
      finalWeek: null,
      isReady: false,
    });
    renderList({ seasonId: null });

    expect(mockUseProjectedSeeds).toHaveBeenCalledWith(null);
    expect(screen.getAllByText('No brackets yet for this division')).toHaveLength(2);
  });
});
