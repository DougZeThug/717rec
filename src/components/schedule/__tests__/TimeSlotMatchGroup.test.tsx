import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';

import TimeSlotMatchGroup from '../TimeSlotMatchGroup';

const mockUseBatchHeadToHead = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useBatchHeadToHead', () => ({
  useBatchHeadToHead: (pairs: Array<{ team1Id: string; team2Id: string }>, enabled: boolean) =>
    mockUseBatchHeadToHead(pairs, enabled),
}));

// Sentinel child so we can assert one card per match without pulling in MatchCard's deps.
vi.mock('@/components/schedule/MatchCard', () => ({
  default: ({ match }: { match: Match }) => <div data-testid="match-card">{match.id}</div>,
}));

const matches: Match[] = [
  { id: 'match-1', team1Id: 'a', team2Id: 'b' },
  { id: 'match-2', team1Id: 'c', team2Id: 'd' },
];

const lastEnabledArg = (): boolean => {
  const calls = mockUseBatchHeadToHead.mock.calls;
  return calls[calls.length - 1][1] as boolean;
};

describe('TimeSlotMatchGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBatchHeadToHead.mockReturnValue({
      getHeadToHead: vi.fn(() => null),
      isLoading: false,
    });
  });

  it('renders the time-slot label, match-count badge, and a card per match when expanded', () => {
    render(<TimeSlotMatchGroup timeSlot="10:00 AM" matches={matches} isFirstTimeSlot />);

    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('2 matches')).toBeInTheDocument();

    const cards = screen.getAllByTestId('match-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('match-1');
    expect(cards[1]).toHaveTextContent('match-2');
  });

  it('only enables the H2H fetch while the group is expanded', async () => {
    render(<TimeSlotMatchGroup timeSlot="10:00 AM" matches={matches} isFirstTimeSlot />);

    // Starts open -> fetch enabled.
    expect(lastEnabledArg()).toBe(true);

    const trigger = screen.getByText('10:00 AM').closest('button') as HTMLButtonElement;

    // Collapse -> fetch disabled and cards unmount.
    fireEvent.click(trigger);
    await waitFor(() => expect(lastEnabledArg()).toBe(false));
    await waitFor(() => expect(screen.queryByTestId('match-card')).not.toBeInTheDocument());

    // Expand again -> fetch re-enabled and cards return.
    fireEvent.click(trigger);
    await waitFor(() => expect(lastEnabledArg()).toBe(true));
    expect(screen.getAllByTestId('match-card')).toHaveLength(2);
  });

  it('starts collapsed (no fetch) when not the first time slot', () => {
    render(<TimeSlotMatchGroup timeSlot="2:00 PM" matches={matches} />);

    expect(screen.getByText('2:00 PM')).toBeInTheDocument();
    expect(lastEnabledArg()).toBe(false);
    expect(screen.queryByTestId('match-card')).not.toBeInTheDocument();
  });
});
