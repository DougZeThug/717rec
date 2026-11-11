import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Plain wrappers: the hover scale is not what this file tests.
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// SeasonalIcon reads the route; the plain icon is enough here.
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false, shouldApplyWinter: false }),
}));

import EventDetails from '../EventDetails';

describe('EventDetails', () => {
  // The four tile labels were 11px, under the 12px floor for text a reader needs.
  it('draws the tile labels at 12px', () => {
    render(
      <EventDetails
        checkInTimeStr=""
        startTimeStr=""
        buyIn="$10"
        payouts="Top 3"
        shouldApplyWinter={false}
      />
    );

    for (const label of ['Check-in', 'Start', 'Buy-in', 'Payouts']) {
      const el = screen.getByText(label);
      expect(el).toHaveClass('text-xs');
      expect(el).not.toHaveClass('text-2xs');
    }
  });

  // Event times are Lancaster time. 23:30 UTC on 12 Nov 2026 is 6:30 PM EST
  // (daylight time ended on 1 Nov), and 00:00 UTC on 13 Nov is 7:00 PM EST.
  it('shows the check-in and start times in Lancaster time with the zone name', () => {
    render(
      <EventDetails
        checkInTimeStr="2026-11-12T23:30:00Z"
        startTimeStr="2026-11-13T00:00:00Z"
        buyIn="$10"
        payouts="Top 3"
        shouldApplyWinter={false}
      />
    );

    // toLocaleTimeString puts a narrow no-break space before "PM"; match any space.
    expect(screen.getByText(/^6:30\sPM\sEST$/)).toBeInTheDocument();
    expect(screen.getByText(/^7:00\sPM\sEST$/)).toBeInTheDocument();
    expect(screen.queryByText('TBD')).not.toBeInTheDocument();
  });

  it('shows daylight time in summer', () => {
    render(
      <EventDetails
        checkInTimeStr="2026-07-09T22:30:00Z"
        startTimeStr=""
        buyIn="$10"
        payouts="Top 3"
        shouldApplyWinter={false}
      />
    );

    expect(screen.getByText(/^6:30\sPM\sEDT$/)).toBeInTheDocument();
    // An empty start time still reads TBD.
    expect(screen.getByText('TBD')).toBeInTheDocument();
  });

  it('uses the winter colours on the tiles and labels', () => {
    render(
      <EventDetails
        checkInTimeStr=""
        startTimeStr=""
        buyIn="$10"
        payouts="Top 3"
        shouldApplyWinter
      />
    );

    const label = screen.getByText('Check-in');
    expect(label).toHaveClass('text-cyan-200/80');
    expect(label).not.toHaveClass('text-white/80');
    expect(label.parentElement).toHaveClass('border-cyan-400/20');
    expect(label.parentElement).not.toHaveClass('border-white/20');
  });
});
