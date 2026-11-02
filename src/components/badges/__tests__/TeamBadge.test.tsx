import { render, screen, waitFor } from '@testing-library/react';
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

describe('TeamBadge as a keyboard control on a phone', () => {
  beforeEach(() => {
    mockIsMobile.value = true;
  });

  it('is a real button named after the badge', () => {
    render(<TeamBadge badge={badge()} />);

    const button = screen.getByRole('button', { name: 'Recreational Champion' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    // Grows the tap area to 44px without changing the drawn size.
    expect(button).toHaveClass('hit-area-44');
  });

  it('shows a focus ring when it takes keyboard focus', () => {
    render(<TeamBadge badge={badge()} />);

    expect(screen.getByRole('button', { name: 'Recreational Champion' })).toHaveClass(
      'focus-visible:ring-2'
    );
  });

  it('is reached with Tab and opens the dialog with Enter', async () => {
    const user = userEvent.setup();
    render(<TeamBadge badge={badge()} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Recreational Champion' })).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(await screen.findByRole('dialog')).toHaveTextContent('2025 Recreational Champion');
  });

  it('opens the dialog with Space', async () => {
    const user = userEvent.setup();
    render(<TeamBadge badge={badge()} />);

    await user.tab();
    await user.keyboard(' ');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('gives focus back to the badge when the dialog closes', async () => {
    const user = userEvent.setup();
    render(<TeamBadge badge={badge()} />);

    await user.tab();
    await user.keyboard('{Enter}');
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Recreational Champion' })).toHaveFocus();
  });

  it('stays a plain element when it sits inside a link (interactive off)', async () => {
    const user = userEvent.setup();
    render(
      <a href="/teams/team-1" onClick={(event) => event.preventDefault()}>
        <TeamBadge badge={badge()} interactive={false} />
      </a>
    );

    // Nothing nested inside the link can be pressed or reached by Tab.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('link')).toHaveFocus();

    await user.click(screen.getByRole('link').firstElementChild as HTMLElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

  // The desktop badge is a hover tooltip with nothing to press.
  it('stays a plain element, not a button', () => {
    mockIsMobile.value = false;
    render(<TeamBadge badge={badge()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
