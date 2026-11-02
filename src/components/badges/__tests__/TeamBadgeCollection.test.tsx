import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsMobile = vi.hoisted(() => ({ value: true }));

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockIsMobile.value }));
vi.mock('@/hooks/useTeamBadges', () => ({
  useTeamBadges: () => ({ data: undefined, isLoading: false, error: null }),
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

describe('TeamBadgeCollection', () => {
  beforeEach(() => {
    mockIsMobile.value = true;
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
});
