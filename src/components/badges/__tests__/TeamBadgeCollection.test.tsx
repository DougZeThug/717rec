import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsMobile = vi.hoisted(() => ({ value: true }));
const mockUseTeamBadges = vi.hoisted(() => vi.fn());
const mockErrorLog = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockIsMobile.value }));
vi.mock('@/hooks/useTeamBadges', () => ({
  useTeamBadges: (...args: unknown[]) => mockUseTeamBadges(...args),
}));
vi.mock('@/utils/logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/logger')>()),
  errorLog: (...args: unknown[]) => mockErrorLog(...args),
}));

import type { TeamBadgeEvent } from '@/types/badges';

import TeamBadgeCollection from '../TeamBadgeCollection';

const badge = (id: string, badgeType: TeamBadgeEvent['badge_type']): TeamBadgeEvent => ({
  id,
  team_id: 'team-1',
  badge_type: badgeType,
  season_id: 'season-1',
  awarded_at: '2025-06-15T12:00:00Z',
  metadata: {},
  is_active: true,
  created_at: '2025-06-15T12:00:00Z',
});

const badges = [badge('b1', 'competitive_champion'), badge('b2', 'competitive_runner_up')];

const idleFetch = { data: undefined, isLoading: false, error: null };

describe('TeamBadgeCollection', () => {
  beforeEach(() => {
    mockIsMobile.value = true;
    mockUseTeamBadges.mockReturnValue(idleFetch);
  });

  it('shows each badge on a phone as a button named after it', () => {
    render(<TeamBadgeCollection teamId="team-1" prefetchedBadges={badges} />);

    expect(
      screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))
    ).toEqual(['Competitive Champion', 'Competitive Runner-Up']);
  });

  // Inside a link a button would be nested interactive content.
  it('shows no buttons when told it is not interactive', () => {
    render(<TeamBadgeCollection teamId="team-1" prefetchedBadges={badges} interactive={false} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  describe('order and limit', () => {
    const dated = (id: string, badgeType: TeamBadgeEvent['badge_type'], awardedAt: string) => ({
      ...badge(id, badgeType),
      awarded_at: awardedAt,
    });
    const labels = () =>
      screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));

    it.each([
      ['streak first', ['streak', 'champion']],
      ['champion first', ['champion', 'streak']],
    ] as const)('lists the championship before other badges, with the %s in', (_name, order) => {
      const byName = {
        // The championship is the older one, so only its kind can put it first.
        champion: dated('c1', 'competitive_champion', '2025-01-01T12:00:00Z'),
        streak: dated('s1', 'hot_streak', '2025-09-01T12:00:00Z'),
      };

      render(
        <TeamBadgeCollection teamId="team-1" prefetchedBadges={order.map((key) => byName[key])} />
      );

      expect(labels()).toEqual(['Competitive Champion', 'Hot Streak']);
    });

    it.each([
      ['older first', ['older', 'newer']],
      ['newer first', ['newer', 'older']],
    ] as const)(
      'lists the newest badge first among the same kind, with the %s in',
      (_name, order) => {
        const byName = {
          older: dated('p1', 'king_slayer', '2025-01-01T12:00:00Z'),
          newer: dated('p2', 'bully', '2025-09-01T12:00:00Z'),
        };

        render(
          <TeamBadgeCollection teamId="team-1" prefetchedBadges={order.map((key) => byName[key])} />
        );

        expect(labels()).toEqual(['Bully', 'King Slayer']);
      }
    );

    it('shows only maxDisplay badges and counts the rest', () => {
      const three = [
        dated('c1', 'competitive_champion', '2025-06-01T12:00:00Z'),
        dated('r1', 'competitive_runner_up', '2025-06-01T12:00:00Z'),
        dated('t1', 'competitive_third_place', '2025-06-01T12:00:00Z'),
      ];

      render(<TeamBadgeCollection teamId="team-1" prefetchedBadges={three} maxDisplay={2} />);

      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('shows every badge when maxDisplay is 0', () => {
      render(<TeamBadgeCollection teamId="team-1" prefetchedBadges={badges} maxDisplay={0} />);

      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
    });

    it('shows no count when every badge fits', () => {
      render(<TeamBadgeCollection teamId="team-1" prefetchedBadges={badges} maxDisplay={2} />);

      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
    });

    it.each([
      ['sm', 'size-5'],
      ['md', 'size-6'],
      ['lg', 'size-8'],
    ] as const)('sizes the count like a %s badge', (size, sizeClass) => {
      render(
        <TeamBadgeCollection teamId="team-1" prefetchedBadges={badges} maxDisplay={1} size={size} />
      );

      expect(screen.getByText('+1')).toHaveClass(sizeClass);
    });

    it('stacks the badges in a column when vertical, and in a row otherwise', () => {
      const { container, rerender } = render(
        <TeamBadgeCollection teamId="team-1" prefetchedBadges={badges} orientation="vertical" />
      );
      expect(container.firstElementChild).toHaveClass('flex-col');

      rerender(<TeamBadgeCollection teamId="team-1" prefetchedBadges={badges} />);
      expect(container.firstElementChild).toHaveClass('flex-row', 'flex-wrap');
      expect(container.firstElementChild).not.toHaveClass('flex-col');
    });
  });

  describe('while the badges load', () => {
    beforeEach(() => {
      mockUseTeamBadges.mockReturnValue({ data: undefined, isLoading: true, error: null });
    });

    it('shows three placeholders and no badges', () => {
      const { container } = render(<TeamBadgeCollection teamId="team-1" />);

      expect(container.firstElementChild?.children).toHaveLength(3);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByText('No achievements yet')).not.toBeInTheDocument();
    });

    it.each([
      ['sm', 'size-5'],
      ['md', 'size-6'],
      ['lg', 'size-8'],
    ] as const)('sizes each placeholder like a %s badge', (size, sizeClass) => {
      const { container } = render(<TeamBadgeCollection teamId="team-1" size={size} />);

      for (const placeholder of container.firstElementChild?.children ?? []) {
        expect(placeholder).toHaveClass(sizeClass, 'rounded-lg');
      }
    });

    it('lays the placeholders out in a row by default', () => {
      const { container } = render(<TeamBadgeCollection teamId="team-1" className="extra" />);

      expect(container.firstElementChild).toHaveClass('flex-row', 'flex-wrap', 'extra');
      expect(container.firstElementChild).not.toHaveClass('flex-col');
    });

    it('stacks the placeholders in a column when vertical', () => {
      const { container } = render(<TeamBadgeCollection teamId="team-1" orientation="vertical" />);

      expect(container.firstElementChild).toHaveClass('flex-col');
      expect(container.firstElementChild).not.toHaveClass('flex-row');
    });

    it('shows supplied badges at once and ignores the loading state', () => {
      render(<TeamBadgeCollection teamId="team-1" prefetchedBadges={badges} />);

      expect(screen.getAllByRole('button')).toHaveLength(2);
    });
  });

  describe('when the badges fail to load', () => {
    const failure = new Error('network down');

    beforeEach(() => {
      mockUseTeamBadges.mockReturnValue({ data: undefined, isLoading: false, error: failure });
    });

    it('shows nothing, and logs the error', () => {
      const { container } = render(<TeamBadgeCollection teamId="team-1" showEmptyState />);

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByText('No achievements yet')).not.toBeInTheDocument();
      expect(mockErrorLog).toHaveBeenCalledWith('Error loading badges:', failure);
    });

    it('ignores the error when badges are supplied', () => {
      render(<TeamBadgeCollection teamId="team-1" prefetchedBadges={badges} />);

      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(mockErrorLog).not.toHaveBeenCalled();
    });
  });

  describe('when the team has no badges', () => {
    it('shows nothing by default when the fetch returns none', () => {
      mockUseTeamBadges.mockReturnValue({ data: [], isLoading: false, error: null });

      const { container } = render(<TeamBadgeCollection teamId="team-1" />);

      expect(container).toBeEmptyDOMElement();
    });

    it('shows nothing by default when no data came back', () => {
      const { container } = render(<TeamBadgeCollection teamId="team-1" />);

      expect(container).toBeEmptyDOMElement();
    });

    it('shows nothing by default when the supplied list is empty', () => {
      const { container } = render(<TeamBadgeCollection teamId="team-1" prefetchedBadges={[]} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('says there are no achievements yet when asked to show an empty state', () => {
      render(<TeamBadgeCollection teamId="team-1" prefetchedBadges={[]} showEmptyState />);

      expect(screen.getByText('No achievements yet')).toBeInTheDocument();
      expect(screen.getByText('Keep competing to earn badges and trophies!')).toBeInTheDocument();
    });
  });

  describe('which badges it asks for', () => {
    it('asks for the badges of the team when none are supplied', () => {
      render(<TeamBadgeCollection teamId="team-1" />);

      expect(mockUseTeamBadges).toHaveBeenCalledWith('team-1');
    });

    it('skips the fetch when badges are supplied', () => {
      render(<TeamBadgeCollection teamId="team-1" prefetchedBadges={badges} />);

      expect(mockUseTeamBadges).toHaveBeenCalledWith('');
      expect(mockUseTeamBadges).not.toHaveBeenCalledWith('team-1');
    });
  });
});
