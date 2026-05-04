import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { TeamAdvancedStats } from '@/hooks/teams/seasonBreakdown';
import type { SeasonBreakdown } from '@/types/teamAdvancedStats';

import { SeasonRow } from '../SeasonRow';
import { TeamAdvancedStatsInsightsTab } from '../TeamAdvancedStatsInsightsTab';
import { TeamAdvancedStatsSummaryCards } from '../TeamAdvancedStatsSummaryCards';

const baseSeason: SeasonBreakdown = {
  seasonId: 's1', seasonName: 'Spring 2025', divisionName: 'Competitive',
  matchWins: 8, matchLosses: 2, winPct: 80, gameWins: 20, gameLosses: 8, gameWinPct: 71,
  sos: 1, powerScore: 1550, playoffWins: 2, playoffLosses: 1, playoffRank: 2,
  isChampion: false, isRunnerUp: true, isTop3: true, sweeps: 3, sweepRate: 0.3,
  closeWins: 2, closeLosses: 1, clutchFactor: 0.66,
  divisionRecords: {
    competitive: { wins: 4, losses: 2, gameWins: 10, gameLosses: 6 },
    intermediate: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
    recreational: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
  },
};

describe('Team advanced stats refactor behavior', () => {
  it('season row expands/collapses division records', () => {
    const { rerender } = render(
      <table><tbody><SeasonRow season={baseSeason} isExpanded={false} onToggle={() => {}} /></tbody></table>
    );
    expect(screen.queryByText('vs Competitive')).not.toBeInTheDocument();
    rerender(<table><tbody><SeasonRow season={baseSeason} isExpanded onToggle={() => {}} /></tbody></table>);
    expect(screen.getByText('vs Competitive')).toBeInTheDocument();
  });

  it('conditionally renders insights blocks', () => {
    const noInsights: TeamAdvancedStats = {
      seasons: [{ ...baseSeason, playoffRank: null, isRunnerUp: false }],
      bestSeason: null, worstSeason: null, averagePowerScore: 1550, powerScoreTrend: 'stable',
      bestDivisionTier: null, worstDivisionTier: null,
    };
    const { rerender } = render(<TeamAdvancedStatsInsightsTab advancedStats={noInsights} />);
    expect(screen.queryByText('Strongest Against')).not.toBeInTheDocument();
    expect(screen.queryByText('Playoff Journeys')).not.toBeInTheDocument();

    const withInsights: TeamAdvancedStats = {
      ...noInsights,
      seasons: [baseSeason, { ...baseSeason, seasonId: 's2', seasonName: 'Fall 2025', playoffRank: 1, isChampion: true, isRunnerUp: false }],
      bestDivisionTier: 'competitive', worstDivisionTier: 'intermediate',
    };
    rerender(<TeamAdvancedStatsInsightsTab advancedStats={withInsights} />);
    expect(screen.getByText('Strongest Against')).toBeInTheDocument();
    expect(screen.getByText('Toughest Matchup')).toBeInTheDocument();
    expect(screen.getByText('Playoff Journeys')).toBeInTheDocument();
  });

  it('selects trend color classes for improving/declining/flat', () => {
    const mk = (trend: TeamAdvancedStats['powerScoreTrend']): TeamAdvancedStats => ({
      seasons: [baseSeason], bestSeason: baseSeason, worstSeason: null,
      averagePowerScore: 1550, powerScoreTrend: trend, bestDivisionTier: null, worstDivisionTier: null,
    });
    const { rerender } = render(<TeamAdvancedStatsSummaryCards advancedStats={mk('improving')} />);
    expect(screen.getByText('improving')).toHaveClass('text-emerald-500');
    rerender(<TeamAdvancedStatsSummaryCards advancedStats={mk('declining')} />);
    expect(screen.getByText('declining')).toHaveClass('text-red-500');
    rerender(<TeamAdvancedStatsSummaryCards advancedStats={mk('stable')} />);
    expect(screen.getByText('stable')).toHaveClass('text-muted-foreground');
  });
});
