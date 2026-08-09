import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';

import WeeklyRecapCard from '../WeeklyRecapCard';
import MoversSection from '../WeeklyRecapMoversSection';

const trend = (teamId: string, delta: number): WeeklyPowerScoreTrend => ({
  teamId,
  teamName: `Team ${teamId}`,
  division: 'Competitive',
  logoUrl: undefined,
  currentScore: 53.8,
  previousScore: 53.8 - delta,
  delta,
  percentChange: 0,
  currentWeek: 7,
  previousWeek: 6,
});

const renderSection = (risers: WeeklyPowerScoreTrend[], faller?: WeeklyPowerScoreTrend) =>
  render(
    <MemoryRouter>
      <MoversSection risers={risers} faller={faller} winter={false} />
    </MemoryRouter>
  );

describe('WeeklyRecapMoversSection', () => {
  it('hides a riser whose change rounds to +0.0', () => {
    renderSection([trend('a', 0.04)]);

    expect(screen.queryByText('Movers')).not.toBeInTheDocument();
  });

  it('shows a riser at the display threshold', () => {
    renderSection([trend('a', 0.05)]);

    expect(screen.getByText('Movers')).toBeInTheDocument();
    expect(screen.getByText('Team a')).toBeInTheDocument();
  });

  it('drops only the zero rows, keeping real movement', () => {
    renderSection([trend('mover', 1.2), trend('flat', 0)]);

    expect(screen.getByText('Team mover')).toBeInTheDocument();
    expect(screen.queryByText('Team flat')).not.toBeInTheDocument();
  });

  it('hides a faller whose change rounds to -0.0', () => {
    renderSection([], trend('f', -0.04));

    expect(screen.queryByText('Movers')).not.toBeInTheDocument();
  });

  it('hides the whole section when nothing moved', () => {
    renderSection([trend('a', 0), trend('b', 0)]);

    expect(screen.queryByText('Movers')).not.toBeInTheDocument();
  });
});

describe('WeeklyRecapCard movers consistency', () => {
  const recapBase = {
    weekNumber: 7,
    mode: 'regular' as const,
    upsets: [],
    hotStreaks: [],
    hasData: false,
  };

  it('hides the entire card when the only movers round to zero', () => {
    render(
      <MemoryRouter>
        <WeeklyRecapCard data={recapBase} risers={[trend('a', 0), trend('b', 0.02)]} />
      </MemoryRouter>
    );

    expect(screen.queryByText('Weekly Recap')).not.toBeInTheDocument();
  });

  it('renders the card when a mover clears the threshold', () => {
    render(
      <MemoryRouter>
        <WeeklyRecapCard data={recapBase} risers={[trend('a', 0.6)]} />
      </MemoryRouter>
    );

    expect(screen.getByText('Weekly Recap')).toBeInTheDocument();
    expect(screen.getByText('Movers')).toBeInTheDocument();
  });
});
