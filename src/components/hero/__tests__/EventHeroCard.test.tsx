import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeroCard } from '@/types/heroCard';

const mocks = vi.hoisted(() => ({
  shouldApplyWinter: false,
  signupCount: undefined as number | undefined,
  useBlindDrawSignupCount: vi.fn(),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ shouldApplyWinter: mocks.shouldApplyWinter }),
  // The shared Card component reads this one.
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('@/hooks/useBlindDrawSignups', () => ({
  useBlindDrawSignupCount: (eventDate?: string) => {
    mocks.useBlindDrawSignupCount(eventDate);
    return { data: mocks.signupCount };
  },
}));

vi.mock('@/components/home/BlindDrawSignupForm', () => ({
  default: ({ eventDate }: { eventDate: string }) => (
    <div data-testid="signup-form">{eventDate}</div>
  ),
}));

// The three children are covered by their own tests. Stubs expose the props they receive.
vi.mock('../EventCountdown', () => ({
  default: ({
    text,
    percent,
    className,
  }: {
    text: string;
    percent: number;
    className?: string;
  }) => (
    <div data-testid="countdown" data-percent={percent} className={className}>
      {text}
    </div>
  ),
}));

vi.mock('../EventDetails', () => ({
  default: (props: {
    checkInTimeStr: string;
    startTimeStr: string;
    buyIn: string;
    payouts: string;
    shouldApplyWinter: boolean;
  }) => (
    <div
      data-testid="event-details"
      data-check-in={props.checkInTimeStr}
      data-start={props.startTimeStr}
      data-buy-in={props.buyIn}
      data-payouts={props.payouts}
      data-winter={String(props.shouldApplyWinter)}
    />
  ),
}));

vi.mock('../PastWinnersDisplay', () => ({
  default: ({
    pastWinners,
    shouldApplyWinter,
  }: {
    pastWinners: unknown[];
    shouldApplyWinter: boolean;
  }) => (
    <div
      data-testid="past-winners"
      data-count={pastWinners.length}
      data-winter={String(shouldApplyWinter)}
    />
  ),
}));

import EventHeroCard from '../EventHeroCard';

const NOW = new Date('2026-01-15T12:00:00Z');
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

const makeCard = (
  overrides: Partial<HeroCard> = {},
  metadata: Record<string, unknown> = {}
): HeroCard =>
  ({
    id: 'card-1',
    slug: 'event',
    title: 'Blind Draw Night',
    subtitle: null,
    body: null,
    card_type: 'event',
    metadata,
    ...overrides,
  }) as unknown as HeroCard;

const activeCard = (
  metadata: Record<string, unknown> = {},
  overrides: Partial<HeroCard> = {}
): HeroCard => makeCard(overrides, { is_active_event: true, ...metadata });

const countdowns = () => screen.queryAllByTestId('countdown');

describe('EventHeroCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.shouldApplyWinter = false;
    mocks.signupCount = undefined;
    mocks.useBlindDrawSignupCount.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basics', () => {
    it('shows the title and body', () => {
      render(<EventHeroCard card={makeCard({ body: 'Bring your own bags.' })} />);

      expect(screen.getByRole('heading', { name: 'Blind Draw Night' })).toBeInTheDocument();
      expect(screen.getByText('Bring your own bags.')).toBeInTheDocument();
    });

    it('leaves out the body when there is none', () => {
      const { container } = render(<EventHeroCard card={makeCard()} />);

      expect(container.querySelector('p')).not.toBeInTheDocument();
    });

    it('shows past winners even when the event is not active', () => {
      render(
        <EventHeroCard
          card={makeCard(
            {},
            { past_winners: [{ week: 1, winners: [{ place: 1, names: 'A & B' }] }] }
          )}
        />
      );

      expect(screen.getByTestId('past-winners')).toHaveAttribute('data-count', '1');
    });

    it('defaults past winners to an empty list', () => {
      render(<EventHeroCard card={makeCard()} />);

      expect(screen.getByTestId('past-winners')).toHaveAttribute('data-count', '0');
    });

    it('handles a card with no metadata at all', () => {
      const card = makeCard();
      (card as unknown as { metadata: unknown }).metadata = null;

      render(<EventHeroCard card={card} />);

      expect(screen.getByRole('heading', { name: 'Blind Draw Night' })).toBeInTheDocument();
      expect(screen.queryByTestId('event-details')).not.toBeInTheDocument();
    });
  });

  describe('event details', () => {
    it('hides details and countdown when the event is not active', () => {
      render(<EventHeroCard card={makeCard({}, { start_time: at(HOUR) })} />);

      expect(screen.queryByTestId('event-details')).not.toBeInTheDocument();
      expect(countdowns()).toHaveLength(0);
    });

    it('passes metadata to the details, with $10 and Top 3 as defaults', () => {
      render(
        <EventHeroCard
          card={activeCard({
            check_in_time: '2026-01-15T22:00:00Z',
            start_time: '2026-01-15T23:00:00Z',
          })}
        />
      );

      const details = screen.getByTestId('event-details');
      expect(details).toHaveAttribute('data-check-in', '2026-01-15T22:00:00Z');
      expect(details).toHaveAttribute('data-start', '2026-01-15T23:00:00Z');
      expect(details).toHaveAttribute('data-buy-in', '$10');
      expect(details).toHaveAttribute('data-payouts', 'Top 3');
    });

    it('passes custom buy-in and payouts to the details', () => {
      render(<EventHeroCard card={activeCard({ buy_in: '$20', payouts: 'Top 5' })} />);

      const details = screen.getByTestId('event-details');
      expect(details).toHaveAttribute('data-buy-in', '$20');
      expect(details).toHaveAttribute('data-payouts', 'Top 5');
    });
  });

  describe('subtitle pill', () => {
    it('shows the subtitle for an active event', () => {
      render(<EventHeroCard card={activeCard({}, { subtitle: 'Every Thursday' })} />);

      expect(screen.getByText('Every Thursday')).toBeInTheDocument();
    });

    it('falls back to the formatted check-in date for an active event with no subtitle', () => {
      render(<EventHeroCard card={activeCard({ check_in_time: '2026-01-15T22:00:00Z' })} />);

      expect(screen.getByText('Thursday, January 15')).toBeInTheDocument();
    });

    it('shows an empty pill for an active event with no subtitle and no check-in time', () => {
      const { container } = render(<EventHeroCard card={activeCard()} />);

      expect(container.querySelector('.lucide-calendar')).toBeInTheDocument();
    });

    it('still shows the subtitle when the event is not active', () => {
      render(
        <EventHeroCard
          card={makeCard({ subtitle: 'Coming soon' }, { check_in_time: '2026-01-15T22:00:00Z' })}
        />
      );

      expect(screen.getByText('Coming soon')).toBeInTheDocument();
      expect(screen.queryByText('Thursday, January 15')).not.toBeInTheDocument();
    });

    it('shows no pill when the event is not active and there is no subtitle', () => {
      const { container } = render(<EventHeroCard card={makeCard()} />);

      expect(container.querySelector('.lucide-calendar')).not.toBeInTheDocument();
    });
  });

  describe('start countdown', () => {
    it('shows hours and minutes while the start is hours away', () => {
      render(<EventHeroCard card={activeCard({ start_time: at(5 * HOUR + 30 * MINUTE) })} />);

      expect(countdowns()[0]).toHaveTextContent('5h 30m until start');
      // 100 - (5.5h / 12h) * 100
      expect(Number(countdowns()[0].dataset.percent)).toBeCloseTo(54.1667, 3);
    });

    it('shows only minutes in the last hour', () => {
      render(<EventHeroCard card={activeCard({ start_time: at(45 * MINUTE) })} />);

      expect(countdowns()[0]).toHaveTextContent('45m until start');
      expect(Number(countdowns()[0].dataset.percent)).toBeCloseTo(93.75, 3);
    });

    it('says Starting now! in the last minute', () => {
      render(<EventHeroCard card={activeCard({ start_time: at(30 * 1000) })} />);

      expect(countdowns()[0]).toHaveTextContent('Starting now!');
      expect(countdowns()[0].dataset.percent).toBe('100');
    });

    it('says Event started! once the start time has passed', () => {
      render(<EventHeroCard card={activeCard({ start_time: at(-MINUTE) })} />);

      expect(countdowns()[0]).toHaveTextContent('Event started!');
      expect(countdowns()[0].dataset.percent).toBe('100');
    });

    it('starts at 0% when the start is more than 12 hours away', () => {
      render(<EventHeroCard card={activeCard({ start_time: at(24 * HOUR) })} />);

      expect(countdowns()[0]).toHaveTextContent('24h 0m until start');
      expect(countdowns()[0].dataset.percent).toBe('0');
    });

    it('shows a desktop copy and a mobile copy that read the same', () => {
      render(<EventHeroCard card={activeCard({ start_time: at(2 * HOUR) })} />);

      const [desktop, mobile] = countdowns();
      expect(countdowns()).toHaveLength(2);
      expect(desktop).toHaveClass('hidden', 'md:block');
      expect(mobile).toHaveClass('md:hidden');
      expect(desktop.textContent).toBe(mobile.textContent);
      expect(desktop.dataset.percent).toBe(mobile.dataset.percent);
    });

    it('shows no countdown without a start time', () => {
      render(<EventHeroCard card={activeCard()} />);

      expect(countdowns()).toHaveLength(0);
    });

    it('updates every minute', () => {
      render(<EventHeroCard card={activeCard({ start_time: at(5 * HOUR + 30 * MINUTE) })} />);
      expect(countdowns()[0]).toHaveTextContent('5h 30m until start');

      act(() => {
        vi.advanceTimersByTime(MINUTE);
      });

      expect(countdowns()[0]).toHaveTextContent('5h 29m until start');
    });

    it('does not update before a full minute has passed', () => {
      render(<EventHeroCard card={activeCard({ start_time: at(5 * HOUR + 30 * MINUTE) })} />);

      act(() => {
        vi.advanceTimersByTime(59 * 1000);
      });

      expect(countdowns()[0]).toHaveTextContent('5h 30m until start');
    });

    it('switches to Event started! when the start time arrives', () => {
      render(<EventHeroCard card={activeCard({ start_time: at(2 * MINUTE) })} />);
      expect(countdowns()[0]).toHaveTextContent('2m until start');

      act(() => {
        vi.advanceTimersByTime(2 * MINUTE);
      });

      expect(countdowns()[0]).toHaveTextContent('Event started!');
    });

    it('restarts the countdown when the start time changes', () => {
      const { rerender } = render(
        <EventHeroCard card={activeCard({ start_time: at(5 * HOUR + 30 * MINUTE) })} />
      );

      rerender(<EventHeroCard card={activeCard({ start_time: at(45 * MINUTE) })} />);

      expect(countdowns()[0]).toHaveTextContent('45m until start');
    });

    it('stops the timer when the card is removed', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const { unmount } = render(<EventHeroCard card={activeCard({ start_time: at(HOUR) })} />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('blind draw signup', () => {
    const blindDrawCard = (
      metadata: Record<string, unknown> = {},
      overrides: Partial<HeroCard> = {}
    ) =>
      activeCard(
        { start_time: '2026-01-15T00:30:00Z', ...metadata },
        { slug: 'blind-draw', ...overrides }
      );

    it('shows the signup form with the event date in Eastern time', () => {
      render(<EventHeroCard card={blindDrawCard()} />);

      // 00:30 UTC on the 15th is still the evening of the 14th in New York.
      expect(screen.getByTestId('signup-form')).toHaveTextContent('2026-01-14');
      expect(mocks.useBlindDrawSignupCount).toHaveBeenLastCalledWith('2026-01-14');
    });

    it('shows the signup count when it is above zero', () => {
      mocks.signupCount = 7;
      render(<EventHeroCard card={blindDrawCard()} />);

      expect(screen.getByText('7 signed up')).toBeInTheDocument();
    });

    it.each([
      ['zero', 0],
      ['not loaded yet', undefined],
    ])('hides the signup count when it is %s', (_label, count) => {
      mocks.signupCount = count;
      render(<EventHeroCard card={blindDrawCard()} />);

      expect(screen.queryByText(/signed up/)).not.toBeInTheDocument();
      expect(screen.getByTestId('signup-form')).toBeInTheDocument();
    });

    it('hides the signup section for other event slugs', () => {
      render(<EventHeroCard card={blindDrawCard({}, { slug: 'tournament' })} />);

      expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument();
    });

    it('hides the signup section when the event is not active', () => {
      render(<EventHeroCard card={blindDrawCard({ is_active_event: false })} />);

      expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument();
    });

    it('hides the signup section when there is no start time', () => {
      render(<EventHeroCard card={blindDrawCard({ start_time: undefined })} />);

      expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument();
      expect(mocks.useBlindDrawSignupCount.mock.lastCall).toEqual([undefined]);
    });
  });

  describe('winter theme', () => {
    it('uses the normal card style by default', () => {
      const { container } = render(<EventHeroCard card={activeCard()} />);

      expect(container.querySelector('.event-card')).not.toBeInTheDocument();
      expect(container.querySelector('.overflow-hidden')).toBeInTheDocument();
      expect(screen.getByTestId('event-details')).toHaveAttribute('data-winter', 'false');
      expect(screen.getByTestId('past-winners')).toHaveAttribute('data-winter', 'false');
    });

    it('uses the winter card style and tells the children', () => {
      mocks.shouldApplyWinter = true;
      const { container } = render(<EventHeroCard card={activeCard()} />);

      expect(container.querySelector('.event-card.winter-card-full')).toBeInTheDocument();
      expect(container.querySelector('.overflow-hidden')).not.toBeInTheDocument();
      expect(screen.getByTestId('event-details')).toHaveAttribute('data-winter', 'true');
      expect(screen.getByTestId('past-winners')).toHaveAttribute('data-winter', 'true');
    });
  });
});
