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
  beforeEach(() => {
    mockIsMobile.value = false;
  });

  it('shows no dialog and keeps the badge icon visible', () => {
    const { container } = render(<TeamBadge badge={badge()} />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a real button named after the badge, with the same focus ring as on a phone', () => {
    render(<TeamBadge badge={badge()} />);

    const button = screen.getByRole('button', { name: 'Recreational Champion' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass(
      'focus-visible:outline-hidden',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    );
    // The 44px tap area is phone-only: on desktop neighbouring areas would overlap.
    expect(button).not.toHaveClass('hit-area-44');
  });

  it('is reached with Tab and shows its tooltip on keyboard focus', async () => {
    const user = userEvent.setup();
    render(<TeamBadge badge={badge()} />);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.tab();

    const button = screen.getByRole('button', { name: 'Recreational Champion' });
    expect(button).toHaveFocus();
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Recreational Champion');
    expect(tooltip).toHaveTextContent('2025 Recreational Champion');
    // The tooltip text is also the button's description for a screen reader.
    expect(button).toHaveAttribute('aria-describedby');
  });

  it('closes the tooltip when it loses focus', async () => {
    const user = userEvent.setup();
    render(<TeamBadge badge={badge()} />);

    await user.tab();
    await screen.findByRole('tooltip');
    await user.tab();

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('closes the tooltip with Escape', async () => {
    const user = userEvent.setup();
    render(<TeamBadge badge={badge()} />);

    await user.tab();
    await screen.findByRole('tooltip');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Recreational Champion' })).toHaveFocus();
  });

  it('opens the same dialog as a phone with Enter, a click and Space', async () => {
    const user = userEvent.setup();
    render(<TeamBadge badge={badge()} />);

    await user.tab();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toHaveTextContent('2025 Recreational Champion');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Focus comes back to the badge, so the keyboard user keeps their place.
    expect(screen.getByRole('button', { name: 'Recreational Champion' })).toHaveFocus();

    await user.keyboard(' ');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Recreational Champion' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('leaves no tooltip on screen when focus comes back after the dialog closes', async () => {
    const user = userEvent.setup();
    render(<TeamBadge badge={badge()} />);

    await user.click(screen.getByRole('button', { name: 'Recreational Champion' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Recreational Champion' })).toHaveFocus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('stays a plain element with no tab stop when it sits inside a link (interactive off)', async () => {
    const user = userEvent.setup();
    render(
      <a href="/teams/team-1" onClick={(event) => event.preventDefault()}>
        <TeamBadge badge={badge()} interactive={false} />
      </a>
    );

    const link = screen.getByRole('link');
    const plainBadge = link.firstElementChild as HTMLElement;
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(plainBadge.tagName).toBe('DIV');
    expect(plainBadge).not.toHaveAttribute('tabindex');

    // Tab lands on the link and the next Tab leaves it: no stop inside.
    await user.tab();
    expect(link).toHaveFocus();
    await user.tab();
    expect(link).not.toHaveFocus();
    expect(document.body).toHaveFocus();

    // The hover tooltip still works for the pointer.
    await user.hover(plainBadge);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Recreational Champion');

    await user.click(plainBadge);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
