import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommandPalette from '@/components/navigation/CommandPalette';

// Polyfill ResizeObserver for jsdom (cmdk needs it).
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  (class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver);

const navigateMock = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: () => ({ data: [] }),
}));

const openPalette = async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>
  );
  await user.click(screen.getByRole('button'));
  return user;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CommandPalette', () => {
  it('lists every page it can jump to', async () => {
    await openPalette();

    for (const name of [
      'Go to Home',
      'View Standings',
      'View Schedule',
      'Browse Teams',
      'View Playoffs',
      'Season History',
      'Message Board',
      'Compare Teams',
      'League Insights',
    ]) {
      expect(await screen.findByText(name)).toBeInTheDocument();
    }
  });

  it('reaches Compare, which no other menu offered', async () => {
    // X-02: /compare used to be reachable only by typing the URL.
    const user = await openPalette();

    await user.click(await screen.findByText('Compare Teams'));

    expect(navigateMock).toHaveBeenCalledWith('/compare');
  });

  it('reaches Insights, which was only a button on /stats', async () => {
    const user = await openPalette();

    await user.click(await screen.findByText('League Insights'));

    expect(navigateMock).toHaveBeenCalledWith('/insights');
  });

  it('opens on Cmd+K', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    expect(screen.queryByText('Go to Home')).not.toBeInTheDocument();

    await user.keyboard('{Meta>}k{/Meta}');

    expect(await screen.findByText('Go to Home')).toBeInTheDocument();
  });
});
