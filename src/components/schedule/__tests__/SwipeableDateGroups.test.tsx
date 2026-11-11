import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
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

// Sentinel child that reveals which group's date it received, and whether it was
// told to open itself as the first group.
vi.mock('@/components/schedule/DateMatchGroup', () => ({
  default: ({ date, isFirstGroup }: { date: Date; isFirstGroup?: boolean }) => (
    <div data-testid="date-match-group" data-first={String(Boolean(isFirstGroup))}>
      {date.toISOString()}
    </div>
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

// One group per night, a day apart.
const makeGroups = (count: number): DateGroup[] =>
  Array.from({ length: count }, (_, i) => ({
    date: new Date(Date.UTC(2026, 6, 1 + i)),
    matches: [],
  }));

// The page owns the index, so a small stand-in owns it here.
const WithIndex = ({ count }: { count: number }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const nights = makeGroups(count);
  return (
    <SwipeableDateGroups
      groupedMatches={nights}
      selectedDate={nights[0].date}
      activeIndex={activeIndex}
      onIndexChange={setActiveIndex}
    />
  );
};

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

  it('names Previous and Next by label, and marks the current date, for a screen reader', () => {
    render(
      <SwipeableDateGroups
        groupedMatches={groups}
        selectedDate={groups[1].date}
        activeIndex={1}
        onIndexChange={vi.fn()}
      />
    );

    // The words are hidden on a phone, so the name has to come from aria-label.
    expect(screen.getByRole('button', { name: 'Previous date' })).toHaveAttribute(
      'aria-label',
      'Previous date'
    );
    expect(screen.getByRole('button', { name: 'Next date' })).toHaveAttribute(
      'aria-label',
      'Next date'
    );

    const dots = screen.getAllByRole('button', { name: /go to/i });
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    expect(dots[0]).not.toHaveAttribute('aria-current');
  });

  // --primary is a fill colour. As text on the page it read under 4.5:1 in the
  // dark theme; text-primary-text is the text shade of the same blue. A button
  // that cannot be pressed stays muted.
  it('draws an enabled Previous or Next in the primary text colour', () => {
    render(
      <SwipeableDateGroups
        groupedMatches={groups}
        selectedDate={groups[1].date}
        activeIndex={1}
        onIndexChange={vi.fn()}
      />
    );

    for (const name of ['Previous date', 'Next date']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveClass('text-primary-text', 'hover:bg-primary/10');
      expect(button).not.toHaveClass('text-primary');
    }
  });

  it('keeps a disabled Previous muted', () => {
    render(
      <SwipeableDateGroups
        groupedMatches={groups}
        selectedDate={groups[0].date}
        activeIndex={0}
        onIndexChange={vi.fn()}
      />
    );

    const previous = screen.getByRole('button', { name: 'Previous date' });
    expect(previous).toHaveClass('text-muted-foreground/50');
    expect(previous).not.toHaveClass('text-primary-text');
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

  describe('the group on screen', () => {
    it.each([0, 1, 2])(
      'is told to open itself, whichever date the carousel is on (index %i)',
      (activeIndex) => {
        render(
          <SwipeableDateGroups
            groupedMatches={groups}
            selectedDate={new Date('2026-06-01T00:00:00.000Z')}
            activeIndex={activeIndex}
            onIndexChange={vi.fn()}
          />
        );

        const shown = screen.getByTestId('date-match-group');
        expect(shown).toHaveTextContent(groups[activeIndex].date.toISOString());
        // The carousel shows one date at a time, so the date on screen is always
        // the first thing the reader sees. A date that opened closed showed a
        // header and an empty screen.
        expect(shown).toHaveAttribute('data-first', 'true');
      }
    );
  });

  describe('with many dates', () => {
    it('keeps one dot per night for nine nights', () => {
      const nights = makeGroups(9);
      render(
        <SwipeableDateGroups
          groupedMatches={nights}
          selectedDate={nights[0].date}
          activeIndex={0}
          onIndexChange={vi.fn()}
        />
      );

      expect(screen.getAllByRole('button', { name: /go to/i })).toHaveLength(9);
      expect(screen.queryByText(/ of 9$/)).not.toBeInTheDocument();
    });

    it('shows "n of N" text instead of dots for ten nights, so Previous and Next stay in reach', () => {
      const nights = makeGroups(10);
      render(
        <SwipeableDateGroups
          groupedMatches={nights}
          selectedDate={nights[0].date}
          activeIndex={0}
          onIndexChange={vi.fn()}
        />
      );

      expect(screen.getByText('1 of 10')).toBeInTheDocument();
      expect(screen.queryAllByRole('button', { name: /go to/i })).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Previous date' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next date' })).toBeEnabled();
    });

    it('moves the text on when Next is pressed, and back when Previous is pressed', () => {
      render(<WithIndex count={19} />);

      expect(screen.getByText('1 of 19')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Next date' }));
      expect(screen.getByText('2 of 19')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Previous date' }));
      expect(screen.getByText('1 of 19')).toBeInTheDocument();
    });
  });
});
