import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match, Team } from '@/types';

import ScheduleContent from '../ScheduleContent';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockIsMobile = vi.hoisted(() => vi.fn(() => false));
// Every night index the phone carousel was drawn with, in order.
const carouselDraws = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile(),
}));

vi.mock('@/hooks/live-scoring/useLiveScoredMatchIds', () => ({
  useLiveScoredMatchIds: () => ({
    liveScoredIds: new Set<string>(),
    isLoading: false,
  }),
}));

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/winter/WinterSection', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../DateMatchGroup', () => ({
  default: ({ matches }: { matches: Match[] }) => (
    <div data-testid="date-match-group">DateMatchGroup:{matches.length}</div>
  ),
}));

// Shows the night on screen and stands in for a swipe to the next one.
vi.mock('../SwipeableDateGroups', () => ({
  default: ({
    groupedMatches,
    activeIndex,
    onIndexChange,
  }: {
    groupedMatches: Array<{ date: Date }>;
    activeIndex: number;
    onIndexChange: (index: number) => void;
  }) => {
    carouselDraws(activeIndex);
    return (
      <div data-testid="swipeable-date-groups">
        SwipeableDateGroups
        <span data-testid="carousel-night">
          {groupedMatches[activeIndex]?.date.toDateString() ?? 'none'}
        </span>
        <button type="button" onClick={() => onIndexChange(activeIndex + 1)}>
          Swipe to next night
        </button>
      </div>
    );
  },
}));

vi.mock('../TimeslotGrouping', () => ({
  default: () => <div data-testid="timeslot-grouping">TimeslotGrouping</div>,
}));

const buildMatch = (overrides: Partial<Match>): Match => ({
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  date: '2026-07-15',
  iscompleted: false,
  ...overrides,
});

const renderContent = (overrides: Partial<React.ComponentProps<typeof ScheduleContent>> = {}) => {
  const setActiveTab = vi.fn();
  const teams: Team[] = [];
  const props: React.ComponentProps<typeof ScheduleContent> = {
    activeTab: 'upcoming',
    setActiveTab,
    filteredMatches: [],
    teams,
    selectedDate: new Date('2026-07-15T00:00:00'),
    groupedTimeslots: {},
    timeslotsLoading: false,
    ...overrides,
  };
  const utils = render(<ScheduleContent {...props} />);
  return { ...utils, setActiveTab };
};

describe('ScheduleContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile.mockReturnValue(false);
  });

  it('shows the "No Upcoming Matches" empty state and wires its actions', async () => {
    const { setActiveTab } = renderContent({ activeTab: 'upcoming', filteredMatches: [] });

    expect(screen.getByText('No Upcoming Matches')).toBeInTheDocument();

    // "View Standings" navigates to /stats.
    await userEvent.click(screen.getByRole('button', { name: /view standings/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/stats');

    // "View Completed" switches tabs via the controlled setter.
    await userEvent.click(screen.getByRole('button', { name: /view completed/i }));
    expect(setActiveTab).toHaveBeenCalledWith('completed');
  });

  it('renders the desktop DateMatchGroup list when matches are present', () => {
    renderContent({
      activeTab: 'upcoming',
      filteredMatches: [
        buildMatch({ id: 'm1', date: '2026-07-15', iscompleted: false }),
        buildMatch({ id: 'm2', date: '2026-07-15', iscompleted: false }),
        // Completed match should be filtered out of the upcoming tab.
        buildMatch({ id: 'm3', date: '2026-07-16', iscompleted: true }),
      ],
    });

    // Empty state must not appear when matches exist.
    expect(screen.queryByText('No Upcoming Matches')).not.toBeInTheDocument();

    const groups = screen.getAllByTestId('date-match-group');
    expect(groups).toHaveLength(1);
    // Only the two non-completed matches on 2026-07-15 are grouped.
    expect(groups[0]).toHaveTextContent('DateMatchGroup:2');

    // Desktop branch does not use the swipeable carousel.
    expect(screen.queryByTestId('swipeable-date-groups')).not.toBeInTheDocument();
  });

  // `iscompleted` is nullable. The tab split used to compare it strictly against
  // a boolean, so a null row matched neither tab and was visible to nobody
  // (UX audit X-13 / L1).
  it('shows a match with no recorded result on the upcoming tab', () => {
    renderContent({
      activeTab: 'upcoming',
      filteredMatches: [buildMatch({ id: 'm1', date: '2026-07-15', iscompleted: null })],
    });

    expect(screen.queryByText('No Upcoming Matches')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('date-match-group')[0]).toHaveTextContent('DateMatchGroup:1');
  });

  it('keeps a match with no recorded result off the completed tab', () => {
    renderContent({
      activeTab: 'completed',
      filteredMatches: [buildMatch({ id: 'm1', date: '2026-07-15', iscompleted: null })],
    });

    expect(screen.queryByTestId('date-match-group')).not.toBeInTheDocument();
  });

  // The tab panel takes keyboard focus and the browser scrolls it to the top of
  // the page, under the 60px sticky bar. scroll-mt-16 leaves room for the bar.
  it.each(['timeslots', 'upcoming', 'completed'])(
    'leaves room under the sticky bar when the %s panel is scrolled into view',
    (activeTab) => {
      renderContent({ activeTab });

      expect(screen.getByRole('tabpanel')).toHaveClass('scroll-mt-16');
    }
  );

  it('calls setActiveTab when the Completed tab trigger is clicked (controlled tabs)', async () => {
    const { setActiveTab } = renderContent({ activeTab: 'upcoming', filteredMatches: [] });

    await userEvent.click(screen.getByRole('tab', { name: /completed/i }));

    expect(setActiveTab).toHaveBeenCalledWith('completed');
  });

  // A search that finds nothing used to say "No Upcoming Matches ... check back
  // soon", a claim about the league that the search caused.
  describe('a search that finds nothing', () => {
    it('says nothing matches, names what was typed, and offers to clear it', async () => {
      const onClearSearch = vi.fn();
      renderContent({ activeTab: 'upcoming', searchTerm: 'zzzz', onClearSearch });

      expect(screen.getByRole('heading', { name: 'No matches' })).toBeInTheDocument();
      expect(screen.getByText(/Nothing matches "zzzz"/)).toBeInTheDocument();
      expect(screen.queryByText('No Upcoming Matches')).not.toBeInTheDocument();
      expect(screen.queryByText(/check back soon/i)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
      expect(onClearSearch).toHaveBeenCalledTimes(1);
    });

    it('does the same on the completed tab, not "No Completed Matches"', () => {
      renderContent({ activeTab: 'completed', searchTerm: 'zzzz', onClearSearch: vi.fn() });

      expect(screen.getByRole('heading', { name: 'No matches' })).toBeInTheDocument();
      expect(screen.queryByText('No Completed Matches')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
    });

    it('treats spaces alone as no search, and keeps the ordinary empty state', () => {
      renderContent({ activeTab: 'upcoming', searchTerm: '   ', onClearSearch: vi.fn() });

      expect(screen.getByText('No Upcoming Matches')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    });

    it('keeps the ordinary empty state when nothing was typed', () => {
      renderContent({ activeTab: 'upcoming', searchTerm: '', onClearSearch: vi.fn() });

      expect(screen.getByText('No Upcoming Matches')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    });

    it('lets a division or My team chip win, because it is the likelier cause', () => {
      renderContent({
        activeTab: 'upcoming',
        searchTerm: 'zzzz',
        hasFilters: true,
        onClearFilters: vi.fn(),
        onClearSearch: vi.fn(),
      });

      expect(screen.getByText('No matches match these filters')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    });

    it('shows no clear button when the page gave it nothing to call', () => {
      renderContent({ activeTab: 'upcoming', searchTerm: 'zzzz' });

      expect(screen.getByRole('heading', { name: 'No matches' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    });

    it('cuts a very long word short so it cannot push the page sideways', () => {
      const longWord = 'x'.repeat(80);
      renderContent({ activeTab: 'upcoming', searchTerm: longWord, onClearSearch: vi.fn() });

      expect(screen.queryByText(new RegExp(longWord, 'u'))).not.toBeInTheDocument();
      expect(screen.getByText(/Nothing matches "x{20,40}…"/u)).toBeInTheDocument();
    });

    it('does not touch the timeslots tab, which the search does not apply to', () => {
      renderContent({
        activeTab: 'timeslots',
        searchTerm: 'zzzz',
        onClearSearch: vi.fn(),
        hasMatchesOnSelectedDate: false,
      });

      expect(screen.getByText('Nothing scheduled for Wed Jul 15')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
      expect(screen.queryByText('No matches')).not.toBeInTheDocument();
    });

    it('does not show the search message when there are matches to list', () => {
      renderContent({
        activeTab: 'upcoming',
        searchTerm: 'alpha',
        onClearSearch: vi.fn(),
        filteredMatches: [buildMatch({ id: 'm1', date: '2026-07-15', iscompleted: false })],
      });

      expect(screen.queryByText('No matches')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('date-match-group')).toHaveLength(1);
    });
  });

  // Doug's B (2026-11-09): on a phone, the night picked on the date strip is
  // the night the Upcoming and Completed cards show, when it has matches.
  describe('the phone carousel follows the picked night', () => {
    const night = (day: string) => new Date(`${day}T00:00:00`);
    const upcoming = [
      buildMatch({ id: 'u1', date: '2026-07-15T18:30:00', iscompleted: false }),
      buildMatch({ id: 'u2', date: '2026-07-22T18:30:00', iscompleted: false }),
      buildMatch({ id: 'u3', date: '2026-07-29T18:30:00', iscompleted: false }),
    ];
    const completed = upcoming.map((m) => ({ ...m, id: `c-${m.id}`, iscompleted: true }));

    beforeEach(() => {
      mockIsMobile.mockReturnValue(true);
      // "Today" is the day before the first night, so the old default is night 1.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-07-14T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens Upcoming on the picked night, chosen in the same render', () => {
      renderContent({
        activeTab: 'upcoming',
        filteredMatches: upcoming,
        selectedDate: night('2026-07-22'),
      });

      expect(screen.getByTestId('carousel-night')).toHaveTextContent('Wed Jul 22 2026');
      // Never drawn on another night first: an effect after the draw would show
      // night 0 for one frame, and a linked-match scroll would find no card.
      expect(carouselDraws).toHaveBeenCalled();
      expect(carouselDraws.mock.calls.every(([index]) => index === 1)).toBe(true);
    });

    it('keeps the old default when the picked night has no upcoming matches', () => {
      renderContent({
        activeTab: 'upcoming',
        filteredMatches: upcoming,
        selectedDate: night('2026-07-18'),
      });

      expect(screen.getByTestId('carousel-night')).toHaveTextContent('Wed Jul 15 2026');
    });

    it('moves Completed to a past night picked on the strip', () => {
      const props: React.ComponentProps<typeof ScheduleContent> = {
        activeTab: 'completed',
        setActiveTab: vi.fn(),
        filteredMatches: completed,
        teams: [],
        selectedDate: night('2026-07-15'),
        groupedTimeslots: {},
        timeslotsLoading: false,
      };
      const { rerender } = render(<ScheduleContent {...props} />);
      // Newest first, so the picked night is the last group, not the first.
      expect(screen.getByTestId('carousel-night')).toHaveTextContent('Wed Jul 15 2026');

      rerender(<ScheduleContent {...props} selectedDate={night('2026-07-22')} />);
      expect(screen.getByTestId('carousel-night')).toHaveTextContent('Wed Jul 22 2026');
    });

    it('opens Completed on the newest night when the picked night has no results', () => {
      renderContent({
        activeTab: 'completed',
        filteredMatches: completed,
        selectedDate: night('2026-07-18'),
      });

      expect(screen.getByTestId('carousel-night')).toHaveTextContent('Wed Jul 29 2026');
    });

    it('does not jump back after a swipe when the matches are fetched again', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const props: React.ComponentProps<typeof ScheduleContent> = {
        activeTab: 'upcoming',
        setActiveTab: vi.fn(),
        filteredMatches: upcoming,
        teams: [],
        selectedDate: night('2026-07-15'),
        groupedTimeslots: {},
        timeslotsLoading: false,
      };
      const { rerender } = render(<ScheduleContent {...props} />);
      expect(screen.getByTestId('carousel-night')).toHaveTextContent('Wed Jul 15 2026');

      await user.click(screen.getByRole('button', { name: 'Swipe to next night' }));
      expect(screen.getByTestId('carousel-night')).toHaveTextContent('Wed Jul 22 2026');

      // A refetch, as the page does it: the same selected Date object (the URL
      // state keeps it for the same day) and a new list of new rows.
      rerender(
        <ScheduleContent
          {...props}
          selectedDate={props.selectedDate}
          filteredMatches={upcoming.map((m) => ({ ...m }))}
        />
      );
      expect(screen.getByTestId('carousel-night')).toHaveTextContent('Wed Jul 22 2026');
    });

    // A tap on a strip chip stores a new Date, even for the night already
    // picked. Keyed on the day alone, the carousel stayed on the night swiped to
    // while the chip for tonight stayed highlighted.
    it('comes back to the picked night when it is picked again after a swipe', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const props: React.ComponentProps<typeof ScheduleContent> = {
        activeTab: 'upcoming',
        setActiveTab: vi.fn(),
        filteredMatches: upcoming,
        teams: [],
        selectedDate: night('2026-07-15'),
        groupedTimeslots: {},
        timeslotsLoading: false,
      };
      const { rerender } = render(<ScheduleContent {...props} />);

      await user.click(screen.getByRole('button', { name: 'Swipe to next night' }));
      expect(screen.getByTestId('carousel-night')).toHaveTextContent('Wed Jul 22 2026');

      // The same night, picked again: a new Date object for the same day.
      rerender(<ScheduleContent {...props} selectedDate={night('2026-07-15')} />);
      expect(screen.getByTestId('carousel-night')).toHaveTextContent('Wed Jul 15 2026');
    });

    it('leaves the desktop list alone: every night, no carousel', () => {
      mockIsMobile.mockReturnValue(false);
      renderContent({
        activeTab: 'upcoming',
        filteredMatches: upcoming,
        selectedDate: night('2026-07-22'),
      });

      expect(screen.getAllByTestId('date-match-group')).toHaveLength(3);
      expect(screen.queryByTestId('swipeable-date-groups')).not.toBeInTheDocument();
    });
  });

  // UX audit SC-01: a date with no timeslots and no matches rendered a bare
  // "No timeslots scheduled for this date." card with nothing to do next.
  describe('the timeslots tab with nothing scheduled', () => {
    const lastPlayedDate = new Date('2026-07-09T00:00:00');
    const nextScheduledDate = new Date('2026-07-23T00:00:00');

    it('names the empty date and offers both ways out', async () => {
      const user = userEvent.setup();
      const onDateSelect = vi.fn();
      const { setActiveTab } = renderContent({
        activeTab: 'timeslots',
        hasMatchesOnSelectedDate: false,
        lastPlayedDate,
        nextScheduledDate,
        onDateSelect,
      });

      expect(screen.getByText('Nothing scheduled for Wed Jul 15')).toBeInTheDocument();
      expect(screen.getByText('The next league night is Thu Jul 23.')).toBeInTheDocument();
      expect(screen.queryByText('No timeslots scheduled for this date.')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /see results from thu jul 9/i }));
      expect(onDateSelect).toHaveBeenCalledWith(lastPlayedDate);
      expect(setActiveTab).toHaveBeenCalledWith('completed');

      await user.click(screen.getByRole('button', { name: /go to thu jul 23/i }));
      expect(onDateSelect).toHaveBeenCalledWith(nextScheduledDate);
      expect(setActiveTab).toHaveBeenCalledWith('timeslots');
    });

    it('says so plainly when no further night is scheduled', () => {
      renderContent({ activeTab: 'timeslots', lastPlayedDate, nextScheduledDate: null });

      expect(
        screen.getByText('No more league nights are on the schedule yet.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^go to /i })).not.toBeInTheDocument();
    });

    it('shows the timeslots instead when the date has some', () => {
      renderContent({
        activeTab: 'timeslots',
        groupedTimeslots: { '6:00 PM': [] },
        lastPlayedDate,
      });

      expect(screen.queryByText(/nothing scheduled for/i)).not.toBeInTheDocument();
    });

    it('stays out of the way while the timeslots are still loading', () => {
      renderContent({ activeTab: 'timeslots', timeslotsLoading: true, lastPlayedDate });

      expect(screen.queryByText(/nothing scheduled for/i)).not.toBeInTheDocument();
    });

    // The Timeslots tab receives only completed matches in filteredMatches, so
    // deriving this locally hid an upcoming match on the selected day.
    it('stays out of the way when the day has a match, even an unplayed one', () => {
      renderContent({
        activeTab: 'timeslots',
        hasMatchesOnSelectedDate: true,
        lastPlayedDate,
        nextScheduledDate,
      });

      expect(screen.queryByText(/nothing scheduled for/i)).not.toBeInTheDocument();
    });
  });
});
