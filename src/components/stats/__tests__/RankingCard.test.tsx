import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, className, onClick }, ref) => (
        <div ref={ref} className={className} onClick={onClick}>
          {children}
        </div>
      )
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('@/utils/logger', () => ({ debugLog: vi.fn() }));

vi.mock('@/components/badges/TeamBadgeCollection', () => ({
  default: ({ teamId }: { teamId: string }) => <div data-testid={`badges-${teamId}`} />,
}));

vi.mock('@/components/ui/entity-card', () => ({
  EntityCard: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <div data-testid="entity-card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/power-score-gauge', () => ({
  PowerScoreGauge: ({ score }: { score: number }) => (
    <div data-testid="power-gauge" data-score={score} />
  ),
}));

import { Ranking } from '@/types';

import RankingCard from '../RankingCard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRanking = (overrides: Partial<Ranking> = {}): Ranking => ({
  teamId: 'team-1',
  teamName: 'Team One',
  wins: 6,
  losses: 2,
  winPercentage: 0.75,
  gamesWon: 14,
  gamesLost: 6,
  gameWinPercentage: 0.7,
  sos: 0.62,
  powerScore: 71.3,
  divisionName: 'Competitive',
  headToHead: {},
  closeMatchLosses: 0,
  ...overrides,
});

const renderCard = (props: Partial<React.ComponentProps<typeof RankingCard>> = {}) =>
  render(
    <MemoryRouter>
      <RankingCard ranking={makeRanking()} index={0} {...props} />
    </MemoryRouter>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RankingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detailed (non-compact) view', () => {
    it('shows team name, division, record and power gauge', () => {
      renderCard();
      expect(screen.getByText('Team One')).toBeInTheDocument();
      expect(screen.getByText('Competitive')).toBeInTheDocument();
      expect(screen.getByText('6-2')).toBeInTheDocument();
      expect(screen.getByTestId('power-gauge')).toHaveAttribute('data-score', '71.3');
    });

    it('shows games, win %, SOS and game % stats', () => {
      renderCard();
      expect(screen.getByText('14-6')).toBeInTheDocument();
      expect(screen.getByText('75.0%')).toBeInTheDocument();
      expect(screen.getByText('0.620')).toBeInTheDocument();
      expect(screen.getByText('70.0%')).toBeInTheDocument();
    });

    it('formats rank as division rank with global rank in parentheses', () => {
      renderCard({ ranking: makeRanking({ divisionRank: 2 }), index: 6 });
      expect(screen.getByText('#2 (7)')).toBeInTheDocument();
    });

    it('shows only the global rank in unified view', () => {
      renderCard({ ranking: makeRanking({ divisionRank: 2 }), index: 6, showDivision: true });
      expect(screen.getByText('#7')).toBeInTheDocument();
    });

    it('shows an em dash for win % when the team has not played', () => {
      renderCard({
        ranking: makeRanking({ wins: 0, losses: 0, winPercentage: 0 }),
      });
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('compact view', () => {
    it('shows rank number, name and record', () => {
      renderCard({ compactView: true, index: 3 });
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Team One')).toBeInTheDocument();
      expect(screen.getByText('6-2')).toBeInTheDocument();
      expect(screen.getByText('71.3')).toBeInTheDocument();
    });

    it('prefers the division rank in division view', () => {
      renderCard({ compactView: true, ranking: makeRanking({ divisionRank: 1 }), index: 9 });
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.queryByText('10')).not.toBeInTheDocument();
    });

    it('appends the division name when showDivision is on', () => {
      renderCard({ compactView: true, showDivision: true });
      expect(screen.getByText(/· Competitive/)).toBeInTheDocument();
    });

    it('hides expanded details until the card is clicked', async () => {
      const onToggleExpand = vi.fn();
      renderCard({ compactView: true, onToggleExpand });

      expect(screen.queryByText('Win %')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('entity-card'));
      expect(onToggleExpand).toHaveBeenCalledWith('team-1');
    });

    it('shows Win %, SOS and a compare button when expanded', () => {
      renderCard({ compactView: true, expandedTeam: 'team-1' });
      expect(screen.getByText('Win %')).toBeInTheDocument();
      expect(screen.getByText('75.0%')).toBeInTheDocument();
      expect(screen.getByText('SOS')).toBeInTheDocument();
      expect(screen.getByText('0.620')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /compare team/i })).toBeInTheDocument();
    });

    it('does not expand for a different expanded team id', () => {
      renderCard({ compactView: true, expandedTeam: 'someone-else' });
      expect(screen.queryByText('Win %')).not.toBeInTheDocument();
    });
  });
});
