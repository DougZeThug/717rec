import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeroCard } from '@/types/heroCard';

import RequestHeroCard from '../RequestHeroCard';

const mutateAsync = vi.fn(() => Promise.resolve());

vi.mock('@/hooks/teams', () => ({
  useTeamsArray: () => ({
    teams: [{ id: 'team-1', name: '3 Amigos' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTeamRequests', () => ({
  useSubmitRequest: () => ({ mutateAsync, isPending: false }),
  useTeamRequests: () => ({ data: [], isLoading: false }),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  m: {
    div: ({ children }: React.HTMLAttributes<HTMLDivElement>) => <div>{children}</div>,
  },
}));

vi.mock('../HeroCardBase', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const card = { id: 'card-1', type: 'request', title: 'Requests' } as unknown as HeroCard;

/** Pick the team and the request type, which is what reveals the fields. */
const openTimeChange = async (user: ReturnType<typeof userEvent.setup>) => {
  render(<RequestHeroCard card={card} />);

  // The team picker is a combobox button showing its own placeholder text.
  await user.click(screen.getByText('Choose a team...'));
  await user.click(await screen.findByRole('option', { name: '3 Amigos' }));
  await user.click(screen.getByRole('button', { name: /time change/i }));
};

describe('RequestHeroCard', () => {
  beforeAll(() => {
    // The team picker is built on cmdk, which observes its own size, and Radix
    // Select captures the pointer. jsdom has neither.
    function ResizeObserverCtor(this: {
      observe: () => undefined;
      unobserve: () => undefined;
      disconnect: () => undefined;
    }) {
      this.observe = () => undefined;
      this.unobserve = () => undefined;
      this.disconnect = () => undefined;
    }
    globalThis.ResizeObserver = ResizeObserverCtor as unknown as typeof ResizeObserver;
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // A typed time could be anything — "7ish", "as early as possible" — and the
  // admin approving it then has nothing exact to act on.
  it("offers the league's real blocks instead of a text box", async () => {
    const user = userEvent.setup();
    await openTimeChange(user);

    expect(screen.queryByPlaceholderText('e.g., 7:00 PM')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Requested timeslot'));

    expect(await screen.findByRole('option', { name: '7:00 + 7:30 PM' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '5:00 + 5:30 PM' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '9:00 + 9:30 PM' })).toBeInTheDocument();
  });

  // 9:30 PM is a real stored time that starts no block, so it can never be
  // booked as one and is not offered on its own.
  it('does not offer a time that starts no block', async () => {
    const user = userEvent.setup();
    await openTimeChange(user);

    await user.click(screen.getByLabelText('Requested timeslot'));

    expect(screen.queryByRole('option', { name: '9:30 PM' })).not.toBeInTheDocument();
  });

  it("stores the block's first time, which is what a booking takes", async () => {
    const user = userEvent.setup();
    await openTimeChange(user);

    await user.click(screen.getByLabelText('Requested timeslot'));
    await user.click(await screen.findByRole('option', { name: '7:00 + 7:30 PM' }));
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          request_type: 'TIME_CHANGE',
          requested_timeslot: '7:00 PM',
        })
      )
    );
  });

  it('cannot send a time change that names no time', async () => {
    const user = userEvent.setup();
    await openTimeChange(user);

    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
  });

  it('says that one time books two', async () => {
    const user = userEvent.setup();
    await openTimeChange(user);

    expect(screen.getByText(/block of two back-to-back slots/i)).toBeInTheDocument();
  });
});
