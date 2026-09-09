import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminMobileNav from '@/components/admin/dashboard/AdminMobileNav';

// vaul needs pointer capture, matchMedia and ResizeObserver, none of which jsdom
// has. The drawer is exercised for real by the e2e pass; here it is reduced to
// "renders its children when open", which is the part these cases are about.
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="sections-drawer">{children}</div> : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

const onTabChange = vi.fn(() => true);

const renderNav = (activeTab = 'timeslots') =>
  render(<AdminMobileNav activeTab={activeTab} onTabChange={onTabChange} />);

const sectionsButton = () => screen.getByRole('button', { name: /Sections/ });

describe('AdminMobileNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks keeps implementations, so a refused-switch case would leak.
    onTabChange.mockReturnValue(true);
  });

  // UX audit X-06: the whole menu used to sit above the section, so every
  // league-night task on a phone began with a full-screen scroll.
  it('keeps the menu closed, showing only the bar', () => {
    renderNav('scores');

    expect(screen.queryByTestId('sections-drawer')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search admin sections...')).not.toBeInTheDocument();
  });

  it('names the section on screen on the button that opens the menu', () => {
    renderNav('pending-matches');

    expect(sectionsButton()).toHaveTextContent('Score approvals');
  });

  it('opens the full section list in a drawer', async () => {
    renderNav('scores');

    await userEvent.click(sectionsButton());

    expect(screen.getByTestId('sections-drawer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search admin sections...')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Admin sections' })).toBeInTheDocument();
  });

  // A refused switch (unsaved work) must leave the menu up, or the admin sees
  // it close as though something happened.
  it('leaves the drawer open when the switch is refused', async () => {
    onTabChange.mockReturnValue(false);
    renderNav('scores');

    await userEvent.click(sectionsButton());
    await userEvent.click(screen.getByRole('button', { name: 'Matchups' }));

    expect(screen.getByTestId('sections-drawer')).toBeInTheDocument();
  });

  it('closes the drawer once a section is chosen', async () => {
    renderNav('scores');

    await userEvent.click(sectionsButton());
    // The Scores & Stats group is open because Scores is the section on screen.
    await userEvent.click(screen.getByRole('button', { name: 'Matchups' }));

    expect(onTabChange).toHaveBeenCalledWith('matchups');
    expect(screen.queryByTestId('sections-drawer')).not.toBeInTheDocument();
  });

  // These are the two league-night jobs, so they stay one tap away.
  it('keeps Quick Access on the page, outside the drawer', async () => {
    renderNav('live-corrections');

    await userEvent.click(screen.getByRole('button', { name: /^Scores$/ }));

    expect(onTabChange).toHaveBeenCalledWith('scores');
    expect(screen.queryByTestId('sections-drawer')).not.toBeInTheDocument();
  });

  it('tells assistive technology the button opens a menu', () => {
    renderNav();

    expect(sectionsButton()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(sectionsButton()).toHaveAttribute('aria-expanded', 'false');
  });
});
