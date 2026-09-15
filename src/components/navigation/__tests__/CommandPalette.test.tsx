import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CommandPalette from '@/components/navigation/CommandPalette';
import { clearUnsavedWork, registerUnsavedWork } from '@/utils/unsavedChanges';

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

const teamsMock = vi.fn(() => ({ data: [] as Array<Record<string, unknown>> }));

vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: () => teamsMock(),
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

const team = (id: string, name: string, divisionName?: string) => ({
  id,
  name,
  divisionName,
});

beforeEach(() => {
  vi.clearAllMocks();
  teamsMock.mockReturnValue({ data: [] });
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

  it('names its trigger even when it is the icon alone', () => {
    // Below xl the button has no visible text. Unnamed, it is the header's
    // axe `button-name` violation from X-01.
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('lists teams by name, with their division', async () => {
    teamsMock.mockReturnValue({
      data: [team('t1', 'Bag Ass Bandits', 'Competitive'), team('t2', 'Cuzzo Crew')],
    });
    const user = await openPalette();

    expect(await screen.findByText('Bag Ass Bandits')).toBeInTheDocument();
    expect(screen.getByText('Competitive')).toBeInTheDocument();
    // A team with no division shows its name and nothing beside it.
    expect(screen.getByText('Cuzzo Crew')).toBeInTheDocument();

    await user.click(screen.getByText('Bag Ass Bandits'));

    expect(navigateMock).toHaveBeenCalledWith('/teams/bag-ass-bandits');
  });

  it('offers the whole teams page once there are more than ten', async () => {
    teamsMock.mockReturnValue({
      data: Array.from({ length: 12 }, (_, i) => team(`t${i}`, `Team ${i}`)),
    });
    const user = await openPalette();

    const viewAll = await screen.findByText('View all 12 teams...');
    expect(viewAll).toBeInTheDocument();
    // Only the first ten are listed individually.
    expect(screen.queryByText('Team 10')).not.toBeInTheDocument();

    await user.click(viewAll);

    expect(navigateMock).toHaveBeenCalledWith('/teams');
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

/**
 * The palette is in the header of every page, the admin console included, and
 * every entry in it is a jump to another page. Nothing asked first.
 */
describe('CommandPalette with unsaved work on screen', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearUnsavedWork();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    registerUnsavedWork({ isDirty: () => true, message: 'Unsaved scores' });
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    clearUnsavedWork();
  });

  it('asks before a jump throws it away', async () => {
    const user = await openPalette();

    await user.click(await screen.findByText('View Standings'));

    expect(confirmSpy).toHaveBeenCalledWith('Unsaved scores');
    expect(navigateMock).toHaveBeenCalledWith('/stats');
  });

  // Asked before the palette closes, not after: a refused jump should leave it
  // exactly as it was, not shut as though something had happened.
  it('goes nowhere and stays open when the admin says no', async () => {
    confirmSpy.mockReturnValue(false);
    const user = await openPalette();

    await user.click(await screen.findByText('View Standings'));

    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByText('View Standings')).toBeInTheDocument();
  });

  it('never asks while there is nothing to lose', async () => {
    clearUnsavedWork();
    const user = await openPalette();

    await user.click(await screen.findByText('View Standings'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/stats');
  });
});
