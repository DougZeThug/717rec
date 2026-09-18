import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RecapTeamGrade } from '@/types/recapEdition';

import { paginateRankings } from '../powerRankingPages';
import PowerRankingsGraphic from '../PowerRankingsGraphic';
import { RECAP_GRAPHIC_HEIGHT, RECAP_GRAPHIC_WIDTH } from '../recapGraphicTokens';

const team = (overrides: Partial<RecapTeamGrade> = {}): RecapTeamGrade => ({
  rank: 1,
  previousRank: 1,
  teamId: 't-1',
  teamName: 'Bag Chasers',
  logoUrl: null,
  division: 'Competitive',
  grade: 'A',
  gpa: 3.8,
  categories: [],
  wins: 6,
  losses: 2,
  powerScore: 72.4,
  delta: 2.1,
  ...overrides,
});

const renderPage = (teams: RecapTeamGrade[], blurbs?: Record<string, string>) =>
  render(
    <PowerRankingsGraphic
      page={paginateRankings(teams)[0]}
      seasonName="Fall 2026"
      weekNumber={6}
      blurbs={blurbs}
    />
  );

describe('PowerRankingsGraphic', () => {
  it('renders at exactly the export size', () => {
    const { container } = renderPage([team()]);
    const frame = container.firstElementChild as HTMLElement;

    expect(frame.style.width).toBe(`${RECAP_GRAPHIC_WIDTH}px`);
    expect(frame.style.height).toBe(`${RECAP_GRAPHIC_HEIGHT}px`);
  });

  it('shows places gained and lost, not power score movement', () => {
    renderPage([
      team({ teamId: 'up', teamName: 'Climbers', rank: 1, previousRank: 4, delta: -9 }),
      team({ teamId: 'down', teamName: 'Sliders', rank: 2, previousRank: 1, delta: 9 }),
    ]);

    // Climbers' power score went DOWN and it still gained three places.
    expect(screen.getByText('▲3')).toBeInTheDocument();
    expect(screen.getByText('▼1')).toBeInTheDocument();
  });

  it('marks a team that held its place', () => {
    renderPage([team({ rank: 3, previousRank: 3 })]);
    expect(screen.getByText('▬')).toBeInTheDocument();
  });

  it('shows a dash, not an arrow, when there is no previous week', () => {
    renderPage([team({ previousRank: null })]);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/[▲▼]/u)).not.toBeInTheDocument();
  });

  it('shows a dash instead of a letter for an unrated team', () => {
    renderPage([team({ grade: null, powerScore: null, previousRank: 1 })]);

    // Both the grade chip and the power score column read as unmeasured.
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('writes the blurb under the team it belongs to', () => {
    renderPage(
      [team({ teamId: 'a', teamName: 'Alpha' }), team({ teamId: 'b', teamName: 'Beta', rank: 2 })],
      { a: 'Unbeaten and not close.' }
    );

    expect(screen.getByText('Unbeaten and not close.')).toBeInTheDocument();
  });

  it('survives a team with no blurb written yet', () => {
    expect(() => renderPage([team()], {})).not.toThrow();
    expect(screen.getByText('Bag Chasers')).toBeInTheDocument();
  });

  it('labels the page when the league needs more than one image', () => {
    const many = Array.from({ length: 26 }, (_, i) =>
      team({ teamId: `t-${i}`, teamName: `Team ${i}`, rank: i + 1 })
    );

    render(
      <PowerRankingsGraphic
        page={paginateRankings(many)[1]}
        seasonName="Fall 2026"
        weekNumber={6}
      />
    );

    expect(screen.getByText('Power Rankings 10–18 · 2 of 3')).toBeInTheDocument();
  });
});
