import { render, screen } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { TeamAdvancedStats } from '@/hooks/teams/seasonBreakdown';
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
vi.mock('@/hooks/useTeamSeasonBreakdown', () => ({
  useTeamSeasonBreakdown: (teamId: string) => mockAdvanced(teamId),
}));

import TeamStats from '../TeamStats';
import TeamReportCard from '../TeamReportCard';
import TeamAdvancedStatsSection from '../TeamAdvancedStatsSection';

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
      />,
    );
    expect(screen.getAllByText('0-0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.0%').length).toBeGreaterThan(0);
  });

  it('report card missing stats fallback', () => {
    mockReportCard.mockReturnValue({ grades: null as TeamGrades | null, isLoading: false });
    render(<TeamReportCard teamId="t1" standalone />);
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
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
