import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockIsMobile = false;
vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('@/components/ui/PowerScoreDisplay', () => ({
  PowerScoreDisplay: ({ score, display }: { score: number; display?: string }) => (
    <div data-testid="power-score" data-score={score} data-display={display} />
  ),
}));

vi.mock('../../RankTrendIndicator', () => ({
  default: ({ rankChange }: { rankChange?: number }) => (
    <div data-testid="trend" data-change={rankChange ?? ''} />
  ),
}));

import { TeamStatsGrid } from '../TeamStatsGrid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultProps = {
  wins: 7,
  losses: 3,
  winPercentage: 0.7,
  gamesWon: 15,
  gamesLost: 8,
  gameWinPercentage: 15 / 23,
  sos: 0.645,
  streak: 'W2',
  powerScore: 68.2,
  rankChange: 1,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TeamStatsGrid', () => {
  beforeEach(() => {
    mockIsMobile = false;
  });

  it('renders the inline record + power score on desktop', () => {
    render(<TeamStatsGrid {...defaultProps} />);
    expect(screen.getByText('7-3')).toBeInTheDocument();
    expect(screen.getByTestId('power-score')).toHaveAttribute('data-score', '68.2');
    expect(screen.getByTestId('power-score')).toHaveAttribute('data-display', 'text');
    // Mobile-only labels should not be present
    expect(screen.queryByText('Record')).not.toBeInTheDocument();
  });

  it('renders the inline layout on mobile when compactView is set', () => {
    mockIsMobile = true;
    render(<TeamStatsGrid {...defaultProps} compactView />);
    expect(screen.getByText('7-3')).toBeInTheDocument();
    expect(screen.queryByText('Record')).not.toBeInTheDocument();
  });

  it('renders the labelled stats grid on mobile', () => {
    mockIsMobile = true;
    render(<TeamStatsGrid {...defaultProps} />);
    expect(screen.getByText('Record')).toBeInTheDocument();
    expect(screen.getByText('7-3')).toBeInTheDocument();
    expect(screen.getByText('Power')).toBeInTheDocument();
    expect(screen.getByText('SOS')).toBeInTheDocument();
    expect(screen.getByText('0.645')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByTestId('trend')).toHaveAttribute('data-change', '1');
    expect(screen.getByTestId('power-score')).toHaveAttribute('data-display', 'gauge');
  });
});
