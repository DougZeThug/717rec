import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RecapFactsV1 } from '@/types/recapEdition';

import RecapSummaryGraphic from '../RecapSummaryGraphic';

const facts = (overrides: Partial<RecapFactsV1> = {}): RecapFactsV1 => ({
  factsSchemaVersion: 1,
  seasonId: 's-1',
  seasonName: 'Fall 2026',
  seasonSlug: 'fall-2026',
  weekNumber: 6,
  weekStartIso: '2026-10-09T04:00:00.000Z',
  weekEndIso: '2026-10-16T04:00:00.000Z',
  upsets: [],
  hotStreaks: [],
  movers: { basis: 'compared', currentWeek: 6, previousWeek: 5, risers: [], faller: null },
  teamOfTheWeek: null,
  divisions: [],
  unresolvedMatchCount: 0,
  generatedAt: '2026-10-16T12:00:00.000Z',
  ...overrides,
});

const upset = {
  winnerId: 'w',
  winnerName: 'Bag Chasers',
  winnerLogoUrl: undefined,
  winnerPowerScore: 40,
  loserId: 'l',
  loserName: 'Corn Stars',
  loserLogoUrl: undefined,
  loserPowerScore: 80,
  powerScoreGap: 40,
  winnerProbability: 0.18,
  matchResult: '2–1',
  weekNumber: 6,
};

const streak = {
  teamId: 's',
  teamName: 'Toss Bosses',
  logoUrl: undefined,
  division: 'Competitive',
  streak: 'W4',
  streakCount: 4,
};

const mover = {
  teamId: 'm',
  teamName: 'Rising Sacks',
  logoUrl: null,
  division: 'Competitive',
  currentScore: 64.2,
  previousScore: 60,
  delta: 4.2,
};

describe('RecapSummaryGraphic', () => {
  it('draws only the stories that exist, with no empty placeholders', () => {
    render(<RecapSummaryGraphic facts={facts({ upsets: [upset] })} headline="" />);

    expect(screen.getByText('Upset of the Week')).toBeInTheDocument();
    expect(screen.queryByText('Hot Streak')).not.toBeInTheDocument();
    expect(screen.queryByText('Team of the Week')).not.toBeInTheDocument();
  });

  it('states the odds that made a result an upset', () => {
    render(<RecapSummaryGraphic facts={facts({ upsets: [upset] })} headline="" />);

    expect(screen.getByText(/beat Corn Stars 2–1 · 18% shot/u)).toBeInTheDocument();
  });

  it('shows all three stories when the week had all three', () => {
    render(
      <RecapSummaryGraphic
        facts={facts({ upsets: [upset], hotStreaks: [streak], teamOfTheWeek: mover })}
        headline="A big week"
      />
    );

    expect(screen.getByText('Upset of the Week')).toBeInTheDocument();
    expect(screen.getByText('Hot Streak')).toBeInTheDocument();
    expect(screen.getByText('Team of the Week')).toBeInTheDocument();
    expect(screen.getByText('A big week')).toBeInTheDocument();
  });

  it('falls back to the biggest riser, labelled honestly, when nobody won the week', () => {
    render(
      <RecapSummaryGraphic
        facts={facts({ teamOfTheWeek: null, movers: { ...facts().movers, risers: [mover] } })}
        headline=""
      />
    );

    expect(screen.getByText('Biggest Riser')).toBeInTheDocument();
    expect(screen.queryByText('Team of the Week')).not.toBeInTheDocument();
  });

  it('omits the headline block entirely when the admin cleared it', () => {
    const { container } = render(<RecapSummaryGraphic facts={facts()} headline="   " />);

    expect(container.textContent).not.toContain('undefined');
    expect(screen.getByText('Week 6')).toBeInTheDocument();
  });
});
