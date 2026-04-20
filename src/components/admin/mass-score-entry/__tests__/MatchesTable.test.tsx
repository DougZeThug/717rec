import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/admin/mass-score-entry/components/DateMatchGroup', () => ({
  default: ({ date }: { date: Date }) => (
    <div data-testid={`date-group-${date.toISOString().slice(0, 10)}`} />
  ),
}));

vi.mock('@/components/admin/mass-score-entry/MatchesTableSkeleton', () => ({
  default: () => <div data-testid="matches-table-skeleton" />,
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ theme: 'light' }),
  default: () => ({ isWinterTheme: false }),
}));

// EmptyState is in components/ui — mock it to keep output simple
vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import MatchesTable from '../MatchesTable';
import { MatchWithTeams } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const noop = vi.fn();

const makeMatch = (id: string, date: string): MatchWithTeams => ({
  id,
  team1Id: 'team-a',
  team2Id: 'team-b',
  date,
  iscompleted: false,
  winnerId: null,
  loserId: null,
  round_number: 0,
  isEdited: false,
  isValid: true,
});

const tableProps = {
  onScoreChange: noop,
  onGameWinsChange: noop,
  onMarkCompleted: noop,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MatchesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the skeleton when loading is true', () => {
    render(<MatchesTable {...tableProps} matches={[]} loading={true} />);

    expect(screen.getByTestId('matches-table-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('renders empty state when there are no matches and not loading', () => {
    render(<MatchesTable {...tableProps} matches={[]} loading={false} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('matches-table-skeleton')).not.toBeInTheDocument();
  });

  it('renders one DateMatchGroup for matches on the same date', () => {
    const matches = [
      makeMatch('m1', '2025-01-04T18:00:00Z'),
      makeMatch('m2', '2025-01-04T20:00:00Z'),
    ];

    render(<MatchesTable {...tableProps} matches={matches} loading={false} />);

    const groups = screen.getAllByTestId(/^date-group-/);
    expect(groups).toHaveLength(1);
  });

  it('renders separate DateMatchGroups for matches on different dates', () => {
    const matches = [
      makeMatch('m1', '2025-01-04T18:00:00Z'),
      makeMatch('m2', '2025-01-11T18:00:00Z'),
    ];

    render(<MatchesTable {...tableProps} matches={matches} loading={false} />);

    const groups = screen.getAllByTestId(/^date-group-/);
    expect(groups).toHaveLength(2);
  });

  it('renders three groups for matches across three different dates', () => {
    const matches = [
      makeMatch('m1', '2025-01-04T18:00:00Z'),
      makeMatch('m2', '2025-01-04T20:00:00Z'),
      makeMatch('m3', '2025-01-11T18:00:00Z'),
      makeMatch('m4', '2025-01-18T18:00:00Z'),
    ];

    render(<MatchesTable {...tableProps} matches={matches} loading={false} />);

    const groups = screen.getAllByTestId(/^date-group-/);
    expect(groups).toHaveLength(3);
  });

  it('renders groups sorted in ascending date order', () => {
    const matches = [
      makeMatch('m1', '2025-01-18T18:00:00Z'),
      makeMatch('m2', '2025-01-04T18:00:00Z'),
    ];

    render(<MatchesTable {...tableProps} matches={matches} loading={false} />);

    const groups = screen.getAllByTestId(/^date-group-/);
    // Earlier date should appear first
    expect(groups[0].dataset.testid).toContain('2025-01-04');
    expect(groups[1].dataset.testid).toContain('2025-01-18');
  });

  it('skips matches with no date', () => {
    const matches = [
      makeMatch('m1', '2025-01-04T18:00:00Z'),
      { ...makeMatch('m2', ''), date: undefined } as MatchWithTeams,
    ];

    render(<MatchesTable {...tableProps} matches={matches} loading={false} />);

    const groups = screen.getAllByTestId(/^date-group-/);
    expect(groups).toHaveLength(1);
  });
});
