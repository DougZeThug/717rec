import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match, Team } from '@/types';

import ScheduleContent from '../ScheduleContent';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockIsMobile = vi.hoisted(() => vi.fn(() => false));

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

vi.mock('../SwipeableDateGroups', () => ({
  default: () => <div data-testid="swipeable-date-groups">SwipeableDateGroups</div>,
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

  it('calls setActiveTab when the Completed tab trigger is clicked (controlled tabs)', async () => {
    const { setActiveTab } = renderContent({ activeTab: 'upcoming', filteredMatches: [] });

    await userEvent.click(screen.getByRole('tab', { name: /completed/i }));

    expect(setActiveTab).toHaveBeenCalledWith('completed');
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
