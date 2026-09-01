import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { TeamAdvancedStats } from '@/hooks/teams/seasonBreakdown';
import type { LetterGrade, TeamGrades } from '@/utils/reportCardUtils';

vi.mock('@/components/ui/CollapsibleSection', () => ({
  CollapsibleSection: ({ children, title }: PropsWithChildren<{ title: string }>) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

const mockReportCard = vi.hoisted(() => vi.fn());
const mockAdvanced = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useTeamReportCard', () => ({
  useTeamReportCard: (teamId: string, mode: 'season' | 'career') => mockReportCard(teamId, mode),
}));
vi.mock('@/hooks/useTeamSeasonBreakdown', () => ({
  useTeamSeasonBreakdown: (teamId: string) => mockAdvanced(teamId),
}));
const mockLeaderboard = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useAllTeamReportCards', () => ({
  useAllTeamReportCards: (mode: 'season' | 'career') => mockLeaderboard(mode),
}));

import TeamAdvancedStatsSection from '../TeamAdvancedStatsSection';
import TeamReportCard from '../TeamReportCard';
import TeamStats from '../TeamStats';

describe('Computed stats rendering', () => {
  it('renders zero-match values correctly', () => {
    render(
      <TeamStats
        wins={0}
        losses={0}
        gameWins={0}
        gameLosses={0}
        winPercentage="0.0"
        gameWinPercentage="0.0"
        sos={0}
        powerScore={0}
      />
    );
    expect(screen.getAllByText('0-0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.0%').length).toBeGreaterThan(0);
  });

  it('report card missing stats fallback', () => {
    mockReportCard.mockReturnValue({ grades: null as TeamGrades | null, isLoading: false });
    render(<TeamReportCard teamId="t1" standalone />);
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
  });

  // Raised by review of the B-36 fix: a failed fetch used to be reported as
  // "not enough data", which blames the team for a problem with the request.
  it('report card shows a retry on a failed load, not the no-data message', async () => {
    const retry = vi.fn();
    mockReportCard.mockReturnValue({
      grades: null as TeamGrades | null,
      isLoading: false,
      error: new Error('network'),
      retry,
    });

    render(<TeamReportCard teamId="t1" standalone />);

    expect(screen.queryByText(/not enough data/i)).not.toBeInTheDocument();
    expect(screen.getByText(/couldn't load the report card/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(retry).toHaveBeenCalled();
  });

  it('report card shows a dash for a grade that cannot be measured', () => {
    const category = (label: string, grade: LetterGrade | null, percentile: number | null) => ({
      label,
      grade,
      percentile,
      description: `${label} description`,
    });
    mockReportCard.mockReturnValue({
      grades: {
        overall: category('Overall', 'A', 90),
        offense: category('Offense', 'B', 75),
        // No deciding third game, so there is no rate to rank.
        clutch: category('Clutch', null, null),
        schedule: category('Schedule', 'C', 55),
        consistency: category('Consistency', 'A', 92),
        games: category('Games', 'B', 70),
        gpa: 3.5,
      } as TeamGrades,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    mockLeaderboard.mockReturnValue({
      leaderboard: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });

    render(<TeamReportCard teamId="t1" standalone />);

    expect(screen.getByText('–')).toBeInTheDocument();
    expect(screen.getByText(/not enough data yet/i)).toBeInTheDocument();
    // The five measurable grades are still shown as letters.
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
  });

  it('advanced section missing seasons fallback', () => {
    mockAdvanced.mockReturnValue({
      advancedStats: { seasons: [] } as unknown as TeamAdvancedStats,
      isLoading: false,
    });
    render(<TeamAdvancedStatsSection teamId="t1" />);
    expect(screen.getByText(/no advanced stats available/i)).toBeInTheDocument();
  });
});
