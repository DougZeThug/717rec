import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import History from '../History';

const mockUseIsMobile = vi.fn();
const mockHistoryState = vi.fn();

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockUseIsMobile() }));
vi.mock('@/hooks/useScrollRestoration', () => ({ default: vi.fn() }));

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/transitions/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/navigation/AnimatedBreadcrumbs', () => ({
  default: () => <p>Breadcrumbs</p>,
}));
vi.mock('@/components/layout/PageHeader', () => ({
  default: ({ title, description }: { title: string; description?: string }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  ),
}));
vi.mock('@/components/history/HistoryPageContent', () => ({
  default: () => {
    const state = mockHistoryState();
    if (state.isLoading) return <p>Loading history...</p>;
    if (state.isEmpty) return <p>No historical data available</p>;
    return <p>Season history content</p>;
  },
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <History />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('History page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
    mockHistoryState.mockReturnValue({ isLoading: false, isEmpty: false });
  });

  it('shows loading state', () => {
    mockHistoryState.mockReturnValue({ isLoading: true, isEmpty: false });
    renderPage();
    expect(screen.getByText('Loading history...')).toBeInTheDocument();
  });

  it('shows happy path render for desktop', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Season History' })).toBeInTheDocument();
    expect(screen.getByText('Season history content')).toBeInTheDocument();
  });

  it('shows empty-state branch when history content is unavailable', () => {
    mockHistoryState.mockReturnValue({ isLoading: false, isEmpty: true });
    renderPage();
    expect(screen.getByText('No historical data available')).toBeInTheDocument();
  });
});
