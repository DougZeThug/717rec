import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { MatchRecap } from '@/utils/liveScoring/matchRecap';

import { MatchRecapSummary } from '../MatchRecapSummary';

const baseRecap: MatchRecap = {
  topPerformer: { playerId: 'p1', name: 'Doug', ppr: 7.6, holePct: 38 },
  mostConsistent: { playerId: 'p2', name: 'Dave', offPct: 12 },
  keyGame: {
    gameNumber: 3,
    team1Score: 22,
    team2Score: 20,
    winnerName: 'Baggers',
    margin: 2,
  },
  teams: [
    {
      side: 1,
      name: 'Baggers',
      bagTotals: { in: 34, on: 51, off: 23, total: 108 },
      players: [
        {
          playerId: 'p1',
          name: 'Doug',
          roundsThrown: 8,
          ppr: 7.6,
          bagsIn: 12,
          bagsOn: 16,
          bagsOff: 4,
          totalBags: 32,
          holePct: 37.5,
          boardPct: 50,
          offPct: 12.5,
        },
      ],
    },
    {
      side: 2,
      name: 'Tossers',
      bagTotals: { in: 29, on: 49, off: 30, total: 108 },
      players: [],
    },
  ],
};

describe('MatchRecapSummary', () => {
  it('renders top performer, most consistent, key game, and round stats', () => {
    render(<MatchRecapSummary recap={baseRecap} />);

    expect(screen.getByText('Top Performer')).toBeInTheDocument();
    expect(screen.getByText(/7\.60 PPR, 38% hole rate/u)).toBeInTheDocument();

    expect(screen.getByText('Most Consistent')).toBeInTheDocument();
    expect(screen.getByText(/12% off-board rate/u)).toBeInTheDocument();

    expect(screen.getByText('Key Game')).toBeInTheDocument();
    expect(screen.getByText(/Baggers won 22–20/u)).toBeInTheDocument();

    expect(screen.getByText('Round Stats')).toBeInTheDocument();
    expect(screen.getByText(/34 in, 51 on, 23 off/u)).toBeInTheDocument();
    expect(screen.getByText(/29 in, 49 on, 30 off/u)).toBeInTheDocument();
    // Doug's per-player line with bag percents.
    expect(screen.getByText(/7\.60 PPR · 38% in · 50% on/u)).toBeInTheDocument();
  });

  it('hides Most Consistent when null', () => {
    render(<MatchRecapSummary recap={{ ...baseRecap, mostConsistent: null }} />);
    expect(screen.queryByText('Most Consistent')).not.toBeInTheDocument();
  });

  it('renders nothing when every section is empty', () => {
    const { container } = render(
      <MatchRecapSummary
        recap={{
          topPerformer: null,
          mostConsistent: null,
          keyGame: null,
          teams: [
            { side: 1, name: 'A', bagTotals: { in: 0, on: 0, off: 0, total: 0 }, players: [] },
            { side: 2, name: 'B', bagTotals: { in: 0, on: 0, off: 0, total: 0 }, players: [] },
          ],
        }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
