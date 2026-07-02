import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { CSSProperties, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Ranking } from '@/types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockIsMobile = true;
vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

// Control whether the component takes the virtualized branch.
let mockShouldVirtualize = false;
vi.mock('@/hooks/useVirtualization', () => ({
  useVirtualization: () => ({ shouldVirtualize: mockShouldVirtualize }),
}));

// Render the virtualized list eagerly so we can assert on our renderRow wiring
// without depending on react-window's layout measurements (unavailable in jsdom).
vi.mock('@/components/ui/VirtualizedList', () => ({
  VirtualizedList: <T,>({
    items,
    renderRow,
  }: {
    items: T[];
    renderRow: (item: T, index: number, style: CSSProperties) => ReactElement;
  }) => <div data-testid="virtualized">{items.map((item, i) => renderRow(item, i, {}))}</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

import CompactStandings from '../CompactStandings';

const makeRanking = (i: number): Ranking => ({
  teamId: `team-${i}`,
  teamName: `Team ${i}`,
  wins: i,
  losses: 0,
  winPercentage: 1,
  gamesWon: i,
  gamesLost: 0,
  gameWinPercentage: 1,
  sos: 0.5,
  powerScore: 100 - i,
  headToHead: {},
  closeMatchLosses: 0,
});

const makeRankings = (n: number): Ranking[] => Array.from({ length: n }, (_, i) => makeRanking(i));

describe('CompactStandings (mobile)', () => {
  beforeEach(() => {
    mockIsMobile = true;
    mockShouldVirtualize = false;
    mockNavigate.mockReset();
  });

  it('renders every team as a plain list when virtualization is off', () => {
    render(<CompactStandings rankings={makeRankings(5)} />);
    expect(screen.queryByTestId('virtualized')).not.toBeInTheDocument();
    expect(screen.getByText('Team 0')).toBeInTheDocument();
    expect(screen.getByText('Team 4')).toBeInTheDocument();
  });

  it('uses the virtualized list for long lists', () => {
    mockShouldVirtualize = true;
    render(<CompactStandings rankings={makeRankings(40)} />);
    expect(screen.getByTestId('virtualized')).toBeInTheDocument();
    expect(screen.getByText('Team 0')).toBeInTheDocument();
    expect(screen.getByText('Team 39')).toBeInTheDocument();
  });

  it('navigates to the team page when a row is clicked', async () => {
    render(<CompactStandings rankings={makeRankings(3)} />);
    await userEvent.click(screen.getByText('Team 1'));
    expect(mockNavigate).toHaveBeenCalledWith('/teams/team-1', expect.any(Object));
  });
});
