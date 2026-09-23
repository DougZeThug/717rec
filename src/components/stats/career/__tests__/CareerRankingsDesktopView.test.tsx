import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import CareerRankingsDesktopView from '@/components/stats/career/CareerRankingsDesktopView';
import type { CareerSortOptions } from '@/components/stats/career/types';
import type { CareerRanking } from '@/types/career';

vi.mock('@/components/shared/TeamLogo', () => ({
  TeamLogo: ({ teamName }: { teamName: string }) => <img alt={teamName} src="" />,
}));

const ranking = (teamId: string, teamName: string): CareerRanking => ({
  teamId,
  teamName,
  logoUrl: null,
  imageUrl: null,
  divisionName: 'Competitive',
  careerMatchWins: 20,
  careerMatchLosses: 10,
  careerWinPercentage: 0.667,
  careerGameWins: 45,
  careerGameLosses: 25,
  careerGameWinPercentage: 0.643,
  careerPlayoffWins: 3,
  careerPlayoffLosses: 1,
  careerPlayoffWinPercentage: 0.75,
  championships: 0,
  runnerUps: 0,
  careerSweepRate: 0.3,
  careerClutchWinPct: 0.5,
  careerClutchGame3s: 4,
  careerPowerScore: 1520,
  careerSos: 0.512,
  playoffFinishes: 2,
});

const sortOptions: CareerSortOptions = { field: 'careerPowerScore', direction: 'desc' };

describe('CareerRankingsDesktopView', () => {
  it('colours the rank: gold for 1st, primary for 2nd-3rd, muted after that', () => {
    render(
      <MemoryRouter>
        <CareerRankingsDesktopView
          rankings={[
            ranking('t1', 'Rail Riders'),
            ranking('t2', 'Bag Bandits'),
            ranking('t3', 'Hole Hunters'),
            ranking('t4', 'Corn Kings'),
          ]}
          sortOptions={sortOptions}
          onSortChange={vi.fn()}
        />
      </MemoryRouter>
    );

    const rankCell = (rank: string) => screen.getByText(rank, { selector: 'td > span' });
    expect(rankCell('1')).toHaveClass('text-amber-500');
    expect(rankCell('2')).toHaveClass('text-primary');
    expect(rankCell('3')).toHaveClass('text-primary');
    expect(rankCell('4')).toHaveClass('text-muted-foreground');
  });
});
