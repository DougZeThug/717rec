import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminMobileNav from '@/components/admin/dashboard/AdminMobileNav';

const onTabChange = vi.fn();

const renderNav = (activeTab = 'timeslots', pendingRequestsCount = 0) =>
  render(
    <AdminMobileNav
      activeTab={activeTab}
      onTabChange={onTabChange}
      pendingRequestsCount={pendingRequestsCount}
    />
  );

/**
 * A section entry in the menu. Scoped to the landmark because Quick Access
 * carries buttons named "Scores" and "Timeslots" too.
 */
const menu = () => screen.getByRole('navigation', { name: 'Admin sections' });
const sectionButton = (name: string) => within(menu()).getByRole('button', { name });
const noSectionButton = (name: string) =>
  expect(within(menu()).queryByRole('button', { name })).not.toBeInTheDocument();

describe('AdminMobileNav', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens the group holding the section on screen', () => {
    renderNav('scores');

    // "Scores & Stats" holds Scores, so its entries are visible.
    expect(sectionButton('Scores')).toBeVisible();
    expect(sectionButton('Matchups')).toBeVisible();
    // A section in another group is not.
    noSectionButton('Divisions');
  });

  it('marks the section on screen as the current page', () => {
    renderNav('scores');

    expect(sectionButton('Scores')).toHaveAttribute('aria-current', 'page');
    expect(sectionButton('Matchups')).not.toHaveAttribute('aria-current');
  });

  // UX audit A-01: the open group was worked out on the first render only, so
  // a League Night quick action left the wrong group open and nothing marked.
  it('follows a section change made somewhere else in the dashboard', () => {
    const { rerender } = renderNav('scores');

    noSectionButton('Live Corrections');

    rerender(<AdminMobileNav activeTab="live-corrections" onTabChange={onTabChange} />);

    expect(sectionButton('Live Corrections')).toHaveAttribute('aria-current', 'page');
  });

  it('leaves a group the admin opened by hand open when the section changes', async () => {
    const { rerender } = renderNav('scores');

    await userEvent.click(within(menu()).getByRole('button', { name: /Teams & Players/ }));
    expect(sectionButton('Divisions')).toBeVisible();

    rerender(<AdminMobileNav activeTab="live-corrections" onTabChange={onTabChange} />);

    expect(sectionButton('Divisions')).toBeVisible();
    expect(sectionButton('Live Corrections')).toBeVisible();
  });

  it('lets the admin close the group holding the section on screen', async () => {
    renderNav('scores');

    await userEvent.click(within(menu()).getByRole('button', { name: /Scores & Stats/ }));

    noSectionButton('Matchups');
  });

  it('asks for the section the admin picks', async () => {
    renderNav('scores');

    await userEvent.click(sectionButton('Matchups'));

    expect(onTabChange).toHaveBeenCalledWith('matchups');
  });

  it('searches every section, not just the open groups', async () => {
    renderNav('scores');

    await userEvent.type(screen.getByPlaceholderText('Search admin sections...'), 'division');

    expect(sectionButton('Divisions')).toBeVisible();
    noSectionButton('Matchups');
  });

  it('keeps Scores and Timeslots one tap away', async () => {
    renderNav('live-corrections');

    // The Quick Access button, outside the menu landmark.
    await userEvent.click(screen.getAllByRole('button', { name: /^Timeslots$/ })[0]);

    expect(onTabChange).toHaveBeenCalledWith('timeslots');
  });

  it('shows the waiting requests count on the section and its group', () => {
    renderNav('teams', 4);

    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
  });
});
