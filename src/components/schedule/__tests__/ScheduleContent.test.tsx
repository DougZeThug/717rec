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
});
