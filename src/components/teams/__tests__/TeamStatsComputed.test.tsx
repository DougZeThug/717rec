import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { TeamAdvancedStats } from '@/hooks/teams/seasonBreakdown';
import type { LetterGrade } from '@/types/reportCard';
import type { SeasonBreakdown } from '@/types/teamAdvancedStats';
import type { TeamGrades } from '@/utils/reportCardUtils';

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
vi.mock('@/hooks/teams/seasonBreakdown', () => ({
  useTeamSeasonBreakdown: (teamId: string) => mockAdvanced(teamId),
}));
const mockLeaderboard = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useAllTeamReportCards', () => ({
  useAllTeamReportCards: (mode: 'season' | 'career') => mockLeaderboard(mode),
}));

import TeamAdvancedStatsSection from '../TeamAdvancedStatsSection';
import TeamReportCard from '../TeamReportCard';

describe('Computed stats rendering', () => {
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

  it("advanced section shows a loading skeleton while the stats load (today's behaviour)", () => {
    mockAdvanced.mockReturnValue({ advancedStats: undefined, isLoading: true, error: null });
    const { container } = render(<TeamAdvancedStatsSection teamId="t1" />);

    expect(screen.getByRole('heading', { name: 'Advanced Stats' })).toBeInTheDocument();
    // One header-sized bar and three row-sized bars.
    expect(container.querySelectorAll('.h-8')).toHaveLength(1);
    expect(container.querySelectorAll('.h-12')).toHaveLength(3);
    expect(screen.queryByText(/no advanced stats available/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it("advanced section shows an error with a Retry that reloads the stats (today's behaviour)", async () => {
    const refetch = vi.fn();
    mockAdvanced.mockReturnValue({
      advancedStats: undefined,
      isLoading: false,
      error: new Error('network'),
      refetch,
    });
    render(<TeamAdvancedStatsSection teamId="t1" />);

    expect(screen.getByText(/couldn't load advanced stats/i)).toBeInTheDocument();
    // A failed load is not reported as "no stats": that would blame the team.
    expect(screen.queryByText(/no advanced stats available/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("advanced section lists each season and opens then closes its division records on click (today's behaviour)", async () => {
    const season: SeasonBreakdown = {
      seasonId: 's1',
      seasonName: 'Spring 2025',
      divisionName: 'Competitive',
      matchWins: 8,
      matchLosses: 2,
      winPct: 80,
      gameWins: 20,
      gameLosses: 8,
      gameWinPct: 71,
      sos: 1,
      powerScore: 1550,
      playoffWins: 2,
      playoffLosses: 1,
      playoffRank: 2,
      isChampion: false,
      isRunnerUp: true,
      isTop3: true,
      sweeps: 3,
      sweepRate: 0.3,
      closeWins: 2,
      closeLosses: 1,
      clutchFactor: 0.66,
      divisionRecords: {
        competitive: { wins: 4, losses: 2, gameWins: 10, gameLosses: 6 },
        intermediate: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
        recreational: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
      },
    };
    mockAdvanced.mockReturnValue({
      advancedStats: {
        seasons: [season],
        bestSeason: null,
        worstSeason: null,
        averagePowerScore: 1550,
        powerScoreTrend: 'stable',
        bestDivisionTier: null,
        worstDivisionTier: null,
      } satisfies TeamAdvancedStats,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<TeamAdvancedStatsSection teamId="t1" />);

    expect(screen.getByRole('tab', { name: 'Season-by-Season' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Insights' })).toBeInTheDocument();
    expect(screen.getByText('Spring 2025')).toBeInTheDocument();
    expect(screen.queryByText('vs Competitive')).not.toBeInTheDocument();

    // First click opens the season's division records.
    await userEvent.click(screen.getByText('Spring 2025'));
    expect(screen.getByText('vs Competitive')).toBeInTheDocument();
    // Only divisions the team actually played are shown.
    expect(screen.queryByText('vs Intermediate')).not.toBeInTheDocument();

    // Second click closes them again.
    await userEvent.click(screen.getByText('Spring 2025'));
    expect(screen.queryByText('vs Competitive')).not.toBeInTheDocument();
  });
});
