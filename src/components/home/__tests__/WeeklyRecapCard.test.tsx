import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import WeeklyRecapCard from '../WeeklyRecapCard';

const recapBase = {
  weekNumber: 7,
  upsets: [],
  hotStreaks: [],
  hasData: false,
};

describe('WeeklyRecapCard', () => {
  it('builds team links from team names/slugs across sections', () => {
    const data = {
      ...recapBase,
      upsets: [
        {
          winnerId: 't1',
          winnerName: 'LA Knights',
          winnerLogoUrl: undefined,
          winnerPowerScore: 75,
          loserId: 't2',
          loserName: 'St. Louis Crew',
          loserLogoUrl: undefined,
          loserPowerScore: 80,
          powerScoreGap: 2.4,
          matchResult: '2-1',
          weekNumber: 7,
        },
      ],
      hotStreaks: [
        {
          teamId: 't3',
          teamName: 'The Jets',
          logoUrl: undefined,
          division: 'West',
          streak: 'W5',
          streakCount: 5,
        },
      ],
    };

    const risers = [
      {
        teamId: 't4',
        teamName: 'NYC Ballers',
        division: 'East',
        logoUrl: undefined,
        previousScore: 1010,
        currentScore: 1040,
        delta: 3,
        percentChange: 2.9,
        currentWeek: 7,
        previousWeek: 6,
      },
    ];

    render(
      <MemoryRouter>
        <WeeklyRecapCard data={data} risers={risers} />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('link', { name: /LA Knights/i })[0]).toHaveAttribute(
      'href',
      '/teams/la-knights'
    );
    expect(screen.getAllByRole('link', { name: /St. Louis Crew/i })[0]).toHaveAttribute(
      'href',
      '/teams/st-louis-crew'
    );
    expect(screen.getAllByRole('link', { name: /The Jets/i })[0]).toHaveAttribute(
      'href',
      '/teams/the-jets'
    );
    expect(screen.getByRole('link', { name: /NYC Ballers/i })).toHaveAttribute(
      'href',
      '/teams/nyc-ballers'
    );
  });

  it('hides missing sections when section data is absent', () => {
    render(
      <MemoryRouter>
        <WeeklyRecapCard data={recapBase} risers={[]} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Weekly Recap')).not.toBeInTheDocument();

    const moversOnly = {
      teamId: 't4',
      teamName: 'Only Movers',
      division: 'East',
      logoUrl: undefined,
      previousScore: 1000,
      currentScore: 1015,
      delta: 1.5,
      percentChange: 1.5,
      currentWeek: 7,
      previousWeek: 6,
    };

    render(
      <MemoryRouter>
        <WeeklyRecapCard data={recapBase} risers={[moversOnly]} />
      </MemoryRouter>
    );

    expect(screen.getByText('Movers')).toBeInTheDocument();
    expect(screen.queryByText('Upsets')).not.toBeInTheDocument();
    expect(screen.queryByText('Top Upsets')).not.toBeInTheDocument();
    expect(screen.queryByText('Hot Streaks')).not.toBeInTheDocument();
    expect(screen.queryByText('Winning Streaks')).not.toBeInTheDocument();
  });

  it('formats mover delta sign for risers and fallers', () => {
    const risers = [
      {
        teamId: 't5',
        teamName: 'Riser Team',
        division: 'East',
        logoUrl: undefined,
        previousScore: 1000,
        currentScore: 1011,
        delta: 1.1,
        percentChange: 1.1,
        currentWeek: 7,
        previousWeek: 6,
      },
    ];

    const faller = {
      teamId: 't6',
      teamName: 'Faller Team',
      division: 'West',
      logoUrl: undefined,
      previousScore: 1000,
      currentScore: 992,
      delta: -0.8,
      percentChange: -0.8,
      currentWeek: 7,
      previousWeek: 6,
    };

    render(
      <MemoryRouter>
        <WeeklyRecapCard data={recapBase} risers={risers} faller={faller} />
      </MemoryRouter>
    );

    expect(screen.getByText('+1.1')).toBeInTheDocument();
    expect(screen.getByText('-0.8')).toBeInTheDocument();
  });
});
