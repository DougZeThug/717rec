import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsMobile = vi.hoisted(() => ({ value: true }));

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockIsMobile.value }));

import type { TeamBadgeEvent } from '@/types/badges';

import { TeamBadge } from '../TeamBadge';

const badge = (overrides: Partial<TeamBadgeEvent> = {}): TeamBadgeEvent => ({
  id: 'badge-1',
  team_id: 'team-1',
  badge_type: 'recreational_champion',
  season_id: 'season-1',
  awarded_at: '2025-06-15T12:00:00Z',
  metadata: {},
  is_active: true,
  created_at: '2025-06-15T12:00:00Z',
  ...overrides,
});

describe('TeamBadge on a phone', () => {
  beforeEach(() => {
    mockIsMobile.value = true;
  });

  it('opens a dialog with the badge name and season details when tapped', async () => {
    const user = userEvent.setup();
    const { container } = render(<TeamBadge badge={badge()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(container.firstElementChild as HTMLElement);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Recreational Champion');
    expect(dialog).toHaveTextContent('2025 Recreational Champion');
  });

  it('shows the plain badge description for a non-championship badge', async () => {
    const user = userEvent.setup();
    const { container } = render(<TeamBadge badge={badge({ badge_type: 'hot_streak' })} />);

    await user.click(container.firstElementChild as HTMLElement);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Hot Streak');
    expect(dialog).toHaveTextContent('Currently on a winning streak of 4+ matches');
  });
});

describe('TeamBadge season descriptions on a phone', () => {
  beforeEach(() => {
    mockIsMobile.value = true;
  });

  it.each([
    ['intermediate_champion', '2025 Intermediate Champion'],
    ['competitive_runner_up', '2025 Competitive Runner-up'],
    ['recreational_third_place', '2025 Recreational Third Place'],
    ['intermediate_third_place', '2025 Intermediate Third Place'],
    ['competitive_champion', '2025 Competitive Champion'],
  ] as const)('describes %s as "%s"', async (badgeType, expected) => {
    const user = userEvent.setup();
    const { container } = render(<TeamBadge badge={badge({ badge_type: badgeType })} />);

    await user.click(container.firstElementChild as HTMLElement);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(expected);
  });
});

describe('TeamBadge on desktop', () => {
  it('shows no dialog and keeps the badge icon visible', () => {
    mockIsMobile.value = false;
    const { container } = render(<TeamBadge badge={badge()} />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
