import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AdminSidebar from '@/components/admin/dashboard/AdminSidebar';
import { switchAdminTab } from '@/utils/adminTabs';
import { clearUnsavedWork, registerUnsavedWork } from '@/utils/unsavedChanges';

// Polyfill ResizeObserver for jsdom (Radix ScrollArea needs it).
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  (class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver);

const mockIsMobile = vi.fn(() => false);

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  m: {
    aside: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <aside {...props}>{children}</aside>
    ),
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
}));

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile(),
}));

const mockPendingRequestsCount = vi.fn(() => 0);

vi.mock('@/hooks/useTeamRequests', () => ({
  usePendingRequestsCount: () => ({ data: mockPendingRequestsCount() }),
}));

vi.mock('@/components/admin/dashboard/AdminMobileNav', () => ({
  default: ({ activeTab }: { activeTab: string }) => (
    <div data-testid="mobile-nav">active:{activeTab}</div>
  ),
}));

const tabButton = (name: RegExp) => screen.getByRole('button', { name });

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

const SectionRoute = () => {
  const { section } = useParams<{ section: string }>();
  return <AdminSidebar section={section as string} />;
};

/**
 * The sidebar reads the open section from the address and changes it by
 * navigating, so the cases below run it inside a real router rather than
 * passing the prop by hand. `location` reports where a click landed.
 */
const renderSidebar = (section = 'timeslots') =>
  render(
    <MemoryRouter initialEntries={[`/admin/${section}`]}>
      <LocationProbe />
      <Routes>
        <Route path="/admin/:section" element={<SectionRoute />} />
      </Routes>
    </MemoryRouter>
  );

const currentPath = () => screen.getByTestId('location').textContent;

describe('AdminSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile.mockReturnValue(false);
    mockPendingRequestsCount.mockReturnValue(0);
    sessionStorage.clear();
    clearUnsavedWork();
  });

  afterEach(() => {
    sessionStorage.clear();
    clearUnsavedWork();
  });

  // Which section a bare /admin opens is AdminDashboard's job; see its tests.
  it('opens the section named by the address', () => {
    renderSidebar('divisions');

    expect(screen.getByRole('button', { name: 'Divisions' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  // Remembering the section belongs to the page, which records whatever it
  // renders; see AdminDashboard's tests.
  it('goes to the section the admin picks', async () => {
    renderSidebar();

    await userEvent.click(tabButton(/divisions/i));

    await waitFor(() => expect(currentPath()).toBe('/admin/divisions'));
  });

  it('changes section when another part of the dashboard asks it to', async () => {
    renderSidebar();

    // This is how the Export tab and the League Night Status tiles navigate.
    // Wrapped in act because the dispatch is synchronous and outside React:
    // without it the navigation it triggers races the scheduler, which made
    // this case flaky under a loaded parallel run.
    act(() => switchAdminTab('divisions'));

    await waitFor(() => expect(currentPath()).toBe('/admin/divisions'));
  });

  // UX audit A-07: switching section threw away unsaved work with no warning.
  describe('when a section holds unsaved work', () => {
    const registerDirtySection = () =>
      registerUnsavedWork({ isDirty: () => true, message: 'Lose the scores?' });

    it('asks before leaving, and stays put when the admin says no', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      registerDirtySection();
      renderSidebar();

      await userEvent.click(tabButton(/divisions/i));

      expect(confirmSpy).toHaveBeenCalledWith('Lose the scores?');
      expect(currentPath()).toBe('/admin/timeslots');
      confirmSpy.mockRestore();
    });

    it('leaves once the admin says to discard it', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      registerDirtySection();
      renderSidebar();

      await userEvent.click(tabButton(/divisions/i));

      await waitFor(() => expect(currentPath()).toBe('/admin/divisions'));
      confirmSpy.mockRestore();
    });

    // League Night quick actions, the Help steps and the Requests toast all
    // arrive this way, and must be asked about too.
    it('asks when another part of the dashboard requests the switch', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      registerDirtySection();
      renderSidebar();

      act(() => switchAdminTab('divisions'));

      await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
      expect(currentPath()).toBe('/admin/timeslots');
      confirmSpy.mockRestore();
    });
  });

  it('filters the menu as the admin searches', async () => {
    renderSidebar();

    expect(tabButton(/divisions/i)).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Search...'), 'division');

    expect(tabButton(/divisions/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^timeslots$/i })).not.toBeInTheDocument();
  });

  it('collapses and expands the sidebar, hiding the search when collapsed', async () => {
    renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('uses the grouped mobile navigation on a phone', () => {
    mockIsMobile.mockReturnValue(true);
    renderSidebar('scores');

    expect(screen.getByTestId('mobile-nav')).toHaveTextContent('active:scores');
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  // UX audit A-02: collapsing hid the label text, which was every item's only
  // accessible name, leaving 21 unnamed icon buttons. It also hid the pending
  // count, the one live number in the menu.
  describe('when collapsed', () => {
    const collapse = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
      await screen.findByRole('button', { name: 'Expand sidebar' });
    };

    it('still names every section for a screen reader', async () => {
      const user = userEvent.setup();
      renderSidebar();

      await collapse(user);

      // The visible text is gone, but the buttons keep their names.
      expect(screen.queryByText('Timeslots')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Timeslots' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Scores' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Requests' })).toBeInTheDocument();
    });

    it('keeps the pending requests count visible', async () => {
      const user = userEvent.setup();
      mockPendingRequestsCount.mockReturnValue(4);
      renderSidebar();

      expect(screen.getByText('4')).toBeInTheDocument();

      await collapse(user);

      expect(screen.getByText('4')).toBeInTheDocument();
    });

    // An explicit aria-label replaces everything inside the button, so the
    // badge would otherwise be silent for a screen reader.
    it('announces the pending count as part of the button name', () => {
      mockPendingRequestsCount.mockReturnValue(4);
      renderSidebar();

      expect(screen.getByRole('button', { name: 'Requests, 4 pending' })).toBeInTheDocument();
      // Other items keep their plain name.
      expect(screen.getByRole('button', { name: 'Scores' })).toBeInTheDocument();
    });

    it('drops the count from the name when there is nothing pending', () => {
      mockPendingRequestsCount.mockReturnValue(0);
      renderSidebar();

      expect(screen.getByRole('button', { name: 'Requests' })).toBeInTheDocument();
    });
  });

  it('marks the open section as the current page', async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.getByRole('button', { name: 'Timeslots' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('button', { name: 'Scores' })).not.toHaveAttribute('aria-current');

    await user.click(screen.getByRole('button', { name: 'Scores' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Scores' })).toHaveAttribute(
        'aria-current',
        'page'
      );
    });
    expect(screen.getByRole('button', { name: 'Timeslots' })).not.toHaveAttribute('aria-current');
  });

  it('labels the section list as a landmark', () => {
    renderSidebar();

    expect(screen.getByRole('navigation', { name: 'Admin sections' })).toBeInTheDocument();
  });
});
