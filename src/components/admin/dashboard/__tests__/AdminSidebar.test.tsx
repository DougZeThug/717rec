import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AdminSidebar from '@/components/admin/dashboard/AdminSidebar';
import { ADMIN_TAB_STORAGE_KEY, switchAdminTab } from '@/utils/adminTabs';

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

describe('AdminSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile.mockReturnValue(false);
    mockPendingRequestsCount.mockReturnValue(0);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('opens on Timeslots when nothing was remembered', () => {
    render(<AdminSidebar />);

    expect(tabButton(/timeslots/i)).toBeInTheDocument();
  });

  it('reopens the section remembered from last time', () => {
    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, 'divisions');
    render(<AdminSidebar />);

    expect(tabButton(/divisions/i)).toBeInTheDocument();
  });

  it('remembers the section the admin picks', async () => {
    render(<AdminSidebar />);

    await userEvent.click(tabButton(/divisions/i));

    expect(sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY)).toBe('divisions');
  });

  it('changes section when another part of the dashboard asks it to', async () => {
    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, 'timeslots');
    render(<AdminSidebar />);

    // This is how the Export tab and the League Night Status tiles navigate.
    switchAdminTab('divisions');

    await waitFor(() => expect(sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY)).toBe('divisions'));
  });

  it('filters the menu as the admin searches', async () => {
    render(<AdminSidebar />);

    expect(tabButton(/divisions/i)).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Search...'), 'division');

    expect(tabButton(/divisions/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^timeslots$/i })).not.toBeInTheDocument();
  });

  it('collapses and expands the sidebar, hiding the search when collapsed', async () => {
    render(<AdminSidebar />);

    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('uses the grouped mobile navigation on a phone', () => {
    mockIsMobile.mockReturnValue(true);
    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, 'scores');
    render(<AdminSidebar />);

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
      render(<AdminSidebar />);

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
      render(<AdminSidebar />);

      expect(screen.getByText('4')).toBeInTheDocument();

      await collapse(user);

      expect(screen.getByText('4')).toBeInTheDocument();
    });

    // An explicit aria-label replaces everything inside the button, so the
    // badge would otherwise be silent for a screen reader.
    it('announces the pending count as part of the button name', () => {
      mockPendingRequestsCount.mockReturnValue(4);
      render(<AdminSidebar />);

      expect(screen.getByRole('button', { name: 'Requests, 4 pending' })).toBeInTheDocument();
      // Other items keep their plain name.
      expect(screen.getByRole('button', { name: 'Scores' })).toBeInTheDocument();
    });

    it('drops the count from the name when there is nothing pending', () => {
      mockPendingRequestsCount.mockReturnValue(0);
      render(<AdminSidebar />);

      expect(screen.getByRole('button', { name: 'Requests' })).toBeInTheDocument();
    });
  });

  it('marks the open section as the current page', async () => {
    const user = userEvent.setup();
    render(<AdminSidebar />);

    // Default section is Timeslots.
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
    render(<AdminSidebar />);

    expect(screen.getByRole('navigation', { name: 'Admin sections' })).toBeInTheDocument();
  });
});
