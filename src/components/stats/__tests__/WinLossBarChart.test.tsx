import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WinLossBarChart from '../WinLossBarChart';

let isDarkSurface = false;

vi.mock('@/hooks/useIsDarkSurface', () => ({
  useIsDarkSurface: () => isDarkSurface,
}));

/**
 * Recharts measures its parent, and jsdom has no layout, so `ResponsiveContainer`
 * would collapse to 0x0 and render nothing. Give it a fixed box instead; every
 * other part of the chart is the real thing.
 */
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 600, height: 220 }}>
        <actual.ResponsiveContainer width={600} height={220}>
          {children as React.ReactElement}
        </actual.ResponsiveContainer>
      </div>
    ),
  };
});

const rows = [
  { displayName: 'Tigers', wins: 5, losses: 2 },
  { displayName: 'Lions', wins: 3, losses: 4 },
];

const chartBox = (container: HTMLElement) => container.querySelector('.rounded-xl') as HTMLElement;

describe('WinLossBarChart', () => {
  beforeEach(() => {
    isDarkSurface = false;
  });

  describe('when there is nothing to plot', () => {
    it('says records come after matches, rather than drawing an empty grid', () => {
      render(<WinLossBarChart data={[]} isMobile={false} />);
      expect(screen.getByText('Records available after matches')).toBeInTheDocument();
    });

    it('treats teams with no games at all as no data', () => {
      render(
        <WinLossBarChart data={[{ displayName: 'Tigers', wins: 0, losses: 0 }]} isMobile={false} />
      );
      expect(screen.getByText('Records available after matches')).toBeInTheDocument();
    });

    it('draws the chart as soon as one team has played', () => {
      render(
        <WinLossBarChart
          data={[
            { displayName: 'Tigers', wins: 0, losses: 0 },
            { displayName: 'Lions', wins: 1, losses: 0 },
          ]}
          isMobile={false}
        />
      );
      expect(screen.queryByText('Records available after matches')).not.toBeInTheDocument();
    });
  });

  describe('the surface it draws on', () => {
    it('uses a white ground on a light page', () => {
      const { container } = render(<WinLossBarChart data={rows} isMobile={false} />);
      expect(chartBox(container)).toHaveStyle({ backgroundColor: '#ffffff' });
    });

    it('uses a dark ground on a dark page', () => {
      // The winter bug this guards: the chart used to ask whether the theme was
      // named "dark", so a winter page got a white chart.
      isDarkSurface = true;
      const { container } = render(<WinLossBarChart data={rows} isMobile={false} />);
      expect(chartBox(container)).toHaveStyle({ backgroundColor: '#1f2937' });
    });
  });

  describe('the team names along the bottom', () => {
    it('shortens a long name but keeps the whole one available on hover', () => {
      render(
        <WinLossBarChart
          data={[{ displayName: 'Bag Fumblers United', wins: 2, losses: 1 }]}
          isMobile={false}
        />
      );

      // `title` is what a mouse hover shows, so the full name is never lost.
      expect(screen.getByText('Bag Fumblers United')).toBeInTheDocument();
      expect(screen.getByText(/^Bag Fumbler…$/u)).toBeInTheDocument();
    });

    it('shortens names harder on a phone, where there is less room', () => {
      render(
        <WinLossBarChart
          data={[{ displayName: 'Bag Fumblers United', wins: 2, losses: 1 }]}
          isMobile
        />
      );
      expect(screen.getByText(/^Bag Fu…$/u)).toBeInTheDocument();
    });

    it('leaves a name that already fits alone', () => {
      render(<WinLossBarChart data={rows} isMobile={false} />);
      // Twice: once as the drawn label, once as the hover title. Both are the
      // whole name, and nothing is elided.
      expect(screen.getAllByText('Tigers')).toHaveLength(2);
      expect(screen.queryByText(/…/u)).not.toBeInTheDocument();
    });
  });
});
