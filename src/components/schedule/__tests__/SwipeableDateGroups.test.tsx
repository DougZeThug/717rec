import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';

import SwipeableDateGroups from '../SwipeableDateGroups';

// Strip motion-only props so a plain <div> doesn't receive unknown DOM attrs.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  m: {
    div: ({ children, className }: { children: ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Sentinel child that reveals which group's date it received.
vi.mock('@/components/schedule/DateMatchGroup', () => ({
  default: ({ date }: { date: Date }) => (
    <div data-testid="date-match-group">{date.toISOString()}</div>
  ),
}));

interface DateGroup {
  date: Date;
  matches: Match[];
}

const groups: DateGroup[] = [
  { date: new Date('2026-07-01T00:00:00.000Z'), matches: [] },
  { date: new Date('2026-07-02T00:00:00.000Z'), matches: [] },
  { date: new Date('2026-07-03T00:00:00.000Z'), matches: [] },
];

describe('SwipeableDateGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nav controls, one dot per group, and the active group child', () => {
    const onIndexChange = vi.fn();
    render(
      <SwipeableDateGroups
        groupedMatches={groups}
        selectedDate={groups[0].date}
        activeIndex={0}
        onIndexChange={onIndexChange}
      />
    );

    // At index 0, Previous is disabled and Next is enabled.
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();

    // One dot button per group (labelled "Go to ...").
    expect(screen.getAllByRole('button', { name: /go to/i })).toHaveLength(3);

    // The mocked child shows group[0]'s date.
    expect(screen.getByTestId('date-match-group')).toHaveTextContent(groups[0].date.toISOString());
  });

  it('fires onIndexChange(1) when Next is clicked', () => {
    const onIndexChange = vi.fn();
    render(
      <SwipeableDateGroups
        groupedMatches={groups}
        selectedDate={groups[0].date}
        activeIndex={0}
        onIndexChange={onIndexChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('fires onIndexChange(idx) when a dot is clicked', () => {
    const onIndexChange = vi.fn();
    render(
      <SwipeableDateGroups
        groupedMatches={groups}
        selectedDate={groups[0].date}
        activeIndex={0}
        onIndexChange={onIndexChange}
      />
    );

    const dots = screen.getAllByRole('button', { name: /go to/i });
    fireEvent.click(dots[2]);
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('renders nothing when there are no groups', () => {
    const { container } = render(
      <SwipeableDateGroups
        groupedMatches={[]}
        selectedDate={new Date('2026-07-01T00:00:00.000Z')}
        activeIndex={0}
        onIndexChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
