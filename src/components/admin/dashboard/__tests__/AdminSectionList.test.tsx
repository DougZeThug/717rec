import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminSectionList from '@/components/admin/dashboard/AdminSectionList';

const onTabChange = vi.fn(() => true);

const renderList = (activeTab = 'timeslots', pendingRequestsCount = 0) =>
  render(
    <AdminSectionList
      activeTab={activeTab}
      onTabChange={onTabChange}
      pendingRequestsCount={pendingRequestsCount}
    />
  );

/** A section entry in the menu, as opposed to a group heading. */
const menu = () => screen.getByRole('navigation', { name: 'Admin sections' });
const sectionButton = (name: string) => within(menu()).getByRole('button', { name });
const noSectionButton = (name: string) =>
  expect(within(menu()).queryByRole('button', { name })).not.toBeInTheDocument();

describe('AdminSectionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks keeps implementations, so a refused-switch case would leak.
    onTabChange.mockReturnValue(true);
  });

  it('opens the group holding the section on screen', () => {
    renderList('scores');

    // "Scores & Stats" holds Scores, so its entries are visible.
    expect(sectionButton('Scores')).toBeVisible();
    expect(sectionButton('Matchups')).toBeVisible();
    // A section in another group is not.
    noSectionButton('Divisions');
  });

  it('marks the section on screen as the current page', () => {
    renderList('scores');

    expect(sectionButton('Scores')).toHaveAttribute('aria-current', 'page');
    expect(sectionButton('Matchups')).not.toHaveAttribute('aria-current');
  });

  // UX audit A-01: the open group was worked out on the first render only, so
  // a League Night quick action left the wrong group open and nothing marked.
  it('follows a section change made somewhere else in the dashboard', () => {
    const { rerender } = renderList('scores');

    noSectionButton('Live Corrections');

    rerender(<AdminSectionList activeTab="live-corrections" onTabChange={onTabChange} />);

    expect(sectionButton('Live Corrections')).toHaveAttribute('aria-current', 'page');
  });

  it('leaves a group the admin opened by hand open when the section changes', async () => {
    const { rerender } = renderList('scores');

    await userEvent.click(within(menu()).getByRole('button', { name: /Teams & Players/ }));
    expect(sectionButton('Divisions')).toBeVisible();

    rerender(<AdminSectionList activeTab="live-corrections" onTabChange={onTabChange} />);

    expect(sectionButton('Divisions')).toBeVisible();
    expect(sectionButton('Live Corrections')).toBeVisible();
  });

  // A-01 again, for a move inside one group. The follow-the-section check keyed
  // on the group, so going from Timeslots to Match Creation — both under
  // Scheduling — did not count as a change, and a group the admin had closed by
  // hand stayed closed with the open section hidden inside it.
  it('reopens a closed group when the section changes inside it', async () => {
    const { rerender } = renderList('timeslots');

    await userEvent.click(within(menu()).getByRole('button', { name: /Scheduling/ }));
    noSectionButton('Timeslots');

    rerender(<AdminSectionList activeTab="batch-matches" onTabChange={onTabChange} />);

    expect(sectionButton('Match Creation')).toHaveAttribute('aria-current', 'page');
  });

  it('lets the admin close the group holding the section on screen', async () => {
    renderList('scores');

    await userEvent.click(within(menu()).getByRole('button', { name: /Scores & Stats/ }));

    noSectionButton('Matchups');
  });

  it('asks for the section the admin picks', async () => {
    renderList('scores');

    await userEvent.click(sectionButton('Matchups'));

    expect(onTabChange).toHaveBeenCalledWith('matchups');
  });

  it('keeps the search text when the switch is refused', async () => {
    onTabChange.mockReturnValue(false);
    renderList('scores');

    const search = screen.getByPlaceholderText('Search admin sections...');
    await userEvent.type(search, 'division');
    await userEvent.click(sectionButton('Divisions'));

    expect(search).toHaveValue('division');
  });

  it('searches every section, not just the open groups', async () => {
    renderList('scores');

    await userEvent.type(screen.getByPlaceholderText('Search admin sections...'), 'division');

    expect(sectionButton('Divisions')).toBeVisible();
    noSectionButton('Matchups');
  });

  it('shows the waiting requests count on the section and its group', () => {
    renderList('teams', 4);

    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
  });
});
