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

vi.mock('@/hooks/useTeamRequests', () => ({
  usePendingRequestsCount: () => ({ data: 0 }),
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
});
