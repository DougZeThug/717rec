import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LeaderboardEntry } from '@/hooks/useAllTeamReportCards';

import ReportCardLeaderboard from '../ReportCardLeaderboard';

const mockUseAllTeamReportCards = vi.hoisted(() => vi.fn());
const mockRetry = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAllTeamReportCards', () => ({
  useAllTeamReportCards: (mode: string) => mockUseAllTeamReportCards(mode),
}));

const entry = (
  teamId: string,
  teamName: string,
  gpa: number,
  overallGrade: LeaderboardEntry['overallGrade'] = 'A'
): LeaderboardEntry => ({ teamId, teamName, logoUrl: null, gpa, overallGrade });

const state = (overrides: Record<string, unknown> = {}) => ({
  leaderboard: [],
  isLoading: false,
  error: null,
  retry: mockRetry,
  ...overrides,
});

const openLeaderboard = async (teamId = 't1') => {
  const user = userEvent.setup();
  render(<ReportCardLeaderboard teamId={teamId} initialMode="season" />);
  await user.click(screen.getByRole('button', { name: /view all gpas/i }));
};

describe('ReportCardLeaderboard', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    mockUseAllTeamReportCards.mockReturnValue(state());
  });

  it('gives the dialog a title and a description for screen readers', async () => {
    await openLeaderboard();

    const dialog = screen.getByRole('dialog', { name: 'GPA Leaderboard' });
    expect(dialog).toHaveAccessibleDescription('Teams ranked by report card GPA.');
  });

  it('shows grey placeholders while the grades load', async () => {
    mockUseAllTeamReportCards.mockReturnValue(state({ isLoading: true }));
    await openLeaderboard();

    expect(
      screen.getByRole('dialog').querySelectorAll('.bg-muted.overflow-hidden').length
    ).toBeGreaterThanOrEqual(8);
  });

  it('says the request failed, and retries on demand, instead of saying there is no data', async () => {
    mockUseAllTeamReportCards.mockReturnValue(state({ error: new Error('boom') }));
    await openLeaderboard();

    expect(screen.getByText(/couldn't load the gpa leaderboard/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('says there is no data yet when no team has a grade', async () => {
    await openLeaderboard();

    expect(screen.getByText('No data available yet.')).toBeInTheDocument();
  });

  it('ranks the teams, marks the current one, and shows a dash for a team with no overall grade', async () => {
    mockUseAllTeamReportCards.mockReturnValue(
      state({
        leaderboard: [
          entry('t2', 'Lions', 3.9),
          entry('t1', 'Tigers', 2.4),
          entry('t3', 'Bears', 0.4, null),
        ],
      })
    );
    await openLeaderboard('t1');

    // The rows keep the order the hook returns them in (it sorts by GPA).
    const names = screen.getAllByText(/^(Lions|Tigers|Bears)$/);
    expect(names.map((el) => el.textContent)).toEqual(['Lions', 'Tigers', 'Bears']);
    expect(names[1].parentElement).toHaveClass('bg-primary/10');
    expect(names[0].parentElement).not.toHaveClass('bg-primary/10');
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it.each([
    [3.6, 'text-emerald-600'],
    [3.2, 'text-blue-600'],
    [2.5, 'text-amber-600'],
    [1.5, 'text-orange-600'],
    [0.5, 'text-red-600'],
  ])('colours a %s GPA with %s', async (gpa, colour) => {
    mockUseAllTeamReportCards.mockReturnValue(state({ leaderboard: [entry('t2', 'Lions', gpa)] }));
    await openLeaderboard();

    expect(screen.getByText(gpa.toFixed(2))).toHaveClass(colour);
  });

  it('asks for the career leaderboard when Career is chosen', async () => {
    await openLeaderboard();

    fireEvent.click(screen.getByRole('radio', { name: 'Career' }));

    expect(mockUseAllTeamReportCards).toHaveBeenCalledWith('career');
  });
});
