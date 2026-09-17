import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RecapDivisionFact, RecapStandingsRow } from '@/types/recapEdition';

import DivisionStandingsGraphic from '../DivisionStandingsGraphic';
import { RECAP_GRAPHIC_HEIGHT, RECAP_GRAPHIC_WIDTH } from '../recapGraphicTokens';

const row = (overrides: Partial<RecapStandingsRow> = {}): RecapStandingsRow => ({
  rank: 1,
  teamId: 't-1',
  teamName: 'Bag Chasers',
  logoUrl: null,
  wins: 6,
  losses: 2,
  gameWins: 14,
  gameLosses: 7,
  powerScore: 72.4,
  delta: 2.1,
  ...overrides,
});

const division = (standings: RecapStandingsRow[]): RecapDivisionFact => ({
  divisionId: 'd-1',
  divisionName: 'Competitive',
  standings,
});

const renderGraphic = (
  standings: RecapStandingsRow[],
  resolveLogo?: (u: string | null) => string | null
) =>
  render(
    <DivisionStandingsGraphic
      division={division(standings)}
      seasonName="Fall 2026"
      weekNumber={6}
      resolveLogo={resolveLogo}
    />
  );

describe('DivisionStandingsGraphic', () => {
  it('renders at exactly the export size', () => {
    const { container } = renderGraphic([row()]);
    const frame = container.firstElementChild as HTMLElement;

    // The PNG is captured from this node, so its geometry is the contract.
    expect(frame.style.width).toBe(`${RECAP_GRAPHIC_WIDTH}px`);
    expect(frame.style.height).toBe(`${RECAP_GRAPHIC_HEIGHT}px`);
  });

  it('keeps the order it was given, without re-sorting', () => {
    // buildRecapFacts already applied the /stats ordering rule. Re-sorting here
    // would be a second, divergent rule.
    renderGraphic([
      row({ rank: 1, teamId: 'a', teamName: 'Alpha', powerScore: 40 }),
      row({ rank: 2, teamId: 'b', teamName: 'Bravo', powerScore: 90 }),
    ]);

    const names = screen.getAllByText(/Alpha|Bravo/).map((el) => el.textContent);
    expect(names).toEqual(['Alpha', 'Bravo']);
  });

  it('truncates a long team name rather than letting it push the numbers off', () => {
    renderGraphic([row({ teamName: 'The Extremely Long Cornhole Team Name That Would Overflow' })]);

    const name = screen.getByText(/Extremely Long Cornhole/);
    expect(name).toHaveStyle({ overflow: 'hidden', whiteSpace: 'nowrap' });
  });

  it('shows a dash for an unrated team instead of a fabricated zero', () => {
    renderGraphic([row({ powerScore: null, delta: null })]);

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('reads a movement inside the rounding band as flat, not "+0.0"', () => {
    renderGraphic([row({ delta: 0.02 })]);

    expect(screen.queryByText('+0.0')).not.toBeInTheDocument();
  });

  it('draws initials when a team has no logo, so the row is never a hole', () => {
    renderGraphic([row({ teamName: 'Bag Chasers', logoUrl: null })]);

    expect(screen.getByText('BC')).toBeInTheDocument();
  });

  it('uses the resolved logo source, which is a data URL during export', () => {
    renderGraphic(
      [row({ logoUrl: 'https://cdn.example/logo.png' })],
      () => 'data:image/png;base64,AAAA'
    );

    const img = document.querySelector('img');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA');
  });

  it('caps the table at ten rows so it stays readable when posted', () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      row({ rank: i + 1, teamId: `t-${i}`, teamName: `Team ${i}` })
    );
    renderGraphic(many);

    expect(screen.queryByText('Team 9')).toBeInTheDocument();
    expect(screen.queryByText('Team 10')).not.toBeInTheDocument();
  });
});
