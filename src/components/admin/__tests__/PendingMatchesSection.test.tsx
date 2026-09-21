import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match, Team } from '@/types';

import PendingMatchesSection from '../PendingMatchesSection';

const mockUsePendingMatches = vi.fn();
const mockUseScoreSubmissions = vi.fn();

vi.mock('@/hooks/usePendingMatches', () => ({
  usePendingMatches: () => mockUsePendingMatches(),
}));
vi.mock('@/hooks/useScoreSubmissions', () => ({
  useScoreSubmissions: () => mockUseScoreSubmissions(),
}));
vi.mock('@/components/admin/scores/ScoreSubmissionsList', () => ({
  default: () => <div>submissions</div>,
}));
vi.mock('@/components/admin/scores/ApproveSubmissionDialog', () => ({ default: () => null }));

const unresolved = (id: string, team1Id: string, team2Id: string) =>
  ({
    id,
    team1Id,
    team2Id,
    date: '2026-01-01T00:00:00Z',
    iscompleted: true,
    team1_game_wins: 1,
    team2_game_wins: 1,
  }) as Match;

const teams: Record<string, Team> = {
  'team-1': { id: 'team-1', name: 'Owls' } as Team,
  'team-2': { id: 'team-2', name: 'Hawks' } as Team,
  'team-3': { id: 'team-3', name: 'Kites' } as Team,
  'team-4': { id: 'team-4', name: 'Terns' } as Team,
};

describe('PendingMatchesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseScoreSubmissions.mockReturnValue({
      submissions: [],
      isLoading: false,
      isApproving: false,
      handleApproveSubmission: vi.fn(),
      handleRejectSubmission: vi.fn(),
    });
    mockUsePendingMatches.mockReturnValue({
      matches: [
        unresolved('match-1', 'team-1', 'team-2'),
        unresolved('match-2', 'team-3', 'team-4'),
      ],
      teams,
      isLoading: false,
      // Must resolve, not just return: the section chains .catch on both.
      handleApproveResult: vi.fn(() => Promise.resolve()),
      handleMarkAsTie: vi.fn(() => Promise.resolve()),
      resolvingMatchIds: new Set<string>(),
    });
  });

  it('lists the matches that have no winner yet', () => {
    render(<PendingMatchesSection />);

    expect(screen.getByText('Owls vs Hawks')).toBeInTheDocument();
    expect(screen.getByText('Kites vs Terns')).toBeInTheDocument();
  });

  // The defect this covers: the list has always accepted a lock, and this
  // section never passed one, so both writes could be asked for at once.
  it('passes the in-flight matches through, so their actions lock', () => {
    mockUsePendingMatches.mockReturnValue({
      ...mockUsePendingMatches(),
      resolvingMatchIds: new Set(['match-1']),
    });

    render(<PendingMatchesSection />);

    expect(screen.getByRole('button', { name: /Owls won/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Hawks won/ })).toBeDisabled();
    // The other match stays pressable, so the queue can still be cleared.
    expect(screen.getByRole('button', { name: /Kites won/ })).toBeEnabled();
  });

  it('leaves every action pressable when nothing is being written', () => {
    render(<PendingMatchesSection />);

    screen.getAllByRole('button').forEach((button) => expect(button).toBeEnabled());
  });

  it('shows a loading state until both reads land', () => {
    mockUsePendingMatches.mockReturnValue({ ...mockUsePendingMatches(), isLoading: true });

    render(<PendingMatchesSection />);

    expect(screen.getByText(/Loading score reports/)).toBeInTheDocument();
  });
});
