import '@testing-library/jest-dom';

import { configure } from '@testing-library/react';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// This makes "screen" available in tests and ensures proper React 18+ testing
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock next-themes to prevent SSR hydration issues in tests
globalThis.matchMedia =
  globalThis.matchMedia ||
  function (query: string): MediaQueryList {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true, // MediaQueryList.dispatchEvent returns boolean
    } as MediaQueryList;
  };

// Mock IntersectionObserver for better test compatibility with complete interface
globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ||
  class IntersectionObserver {
    root: Element | null = null;
    rootMargin: string = '0px';
    thresholds: ReadonlyArray<number> = [];

    constructor() {}
    observe() {
      return null;
    }
    disconnect() {
      return null;
    }
    unobserve() {
      return null;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };

// ============================================================================
// CENTRALIZED TEST UTILITIES
// ============================================================================

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, MemoryRouterProps } from 'react-router';
import { vi } from 'vitest';

// ============================================================================
// SUPABASE MOCK
// ============================================================================

/**
 * Centralized Supabase client mock
 * Use this in tests to avoid repetitive mocking
 *
 * Example usage in tests:
 * import { mockSupabase } from '@/setupTests';
 *
 * mockSupabase.from.mockReturnValue({
 *   select: vi.fn().mockReturnThis(),
 *   eq: vi.fn().mockResolvedValue({ data: [...], error: null }),
 * });
 */
export const mockSupabase = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
  rpc: vi.fn(),
};

// Mock the Supabase client module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// ============================================================================
// REACT QUERY TEST UTILITIES
// ============================================================================

/**
 * Creates a new QueryClient configured for testing
 * Disables retries and sets short cache times for faster tests
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

/**
 * React Query wrapper component for tests
 * Wraps children with a fresh QueryClientProvider
 */
export function QueryWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ============================================================================
// REACT ROUTER TEST UTILITIES
// ============================================================================

/**
 * React Router wrapper component for tests
 * Wraps children with MemoryRouter for routing tests
 */
export function RouterWrapper({
  children,
  initialEntries = ['/'],
  initialIndex,
}: {
  children: React.ReactNode;
  initialEntries?: MemoryRouterProps['initialEntries'];
  initialIndex?: MemoryRouterProps['initialIndex'];
}) {
  return React.createElement(
    MemoryRouter,
    { initialEntries, initialIndex },
    children
  );
}

// ============================================================================
// COMBINED TEST RENDERER
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withRouter?: boolean;
  withQuery?: boolean;
  routerProps?: {
    initialEntries?: MemoryRouterProps['initialEntries'];
    initialIndex?: MemoryRouterProps['initialIndex'];
  };
  queryClient?: QueryClient;
}

/**
 * Custom render function with all common providers
 * Automatically wraps components with QueryClient and Router
 *
 * Example usage:
 * renderWithProviders(<MyComponent />, {
 *   withRouter: true,
 *   withQuery: true,
 *   routerProps: { initialEntries: ['/teams'] }
 * });
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    withRouter = false,
    withQuery = true,
    routerProps = {},
    queryClient,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const testQueryClient = queryClient || createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    let wrapped = children;

    // Wrap with QueryClient if requested
    if (withQuery) {
      wrapped = React.createElement(
        QueryClientProvider,
        { client: testQueryClient },
        wrapped
      );
    }

    // Wrap with Router if requested
    if (withRouter) {
      wrapped = React.createElement(
        MemoryRouter,
        {
          initialEntries: routerProps.initialEntries || ['/'],
          initialIndex: routerProps.initialIndex,
        },
        wrapped
      );
    }

    return React.createElement(React.Fragment, {}, wrapped);
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  };
}

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

/**
 * Factory for creating test season data
 */
export function createMockSeason(overrides: Partial<any> = {}) {
  return {
    id: 'season-1',
    name: 'Test Season 2024',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_current: true,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Factory for creating test division data
 */
export function createMockDivision(overrides: Partial<any> = {}) {
  return {
    id: 'division-1',
    name: 'Test Division',
    season_id: 'season-1',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Factory for creating test team data
 */
export function createMockTeam(overrides: Partial<any> = {}) {
  return {
    id: 'team-1',
    name: 'Test Team',
    division_id: 'division-1',
    season_id: 'season-1',
    wins: 0,
    losses: 0,
    power_score: 1500,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Factory for creating test match data
 */
export function createMockMatch(overrides: Partial<any> = {}) {
  return {
    id: 'match-1',
    season_id: 'season-1',
    division_id: 'division-1',
    team1_id: 'team-1',
    team2_id: 'team-2',
    team1_score: null,
    team2_score: null,
    team1_game_wins: null,
    team2_game_wins: null,
    match_date: '2024-06-01',
    court: 1,
    time_slot: '18:00',
    is_playoff: false,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Factory for creating test user/profile data
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Factory for creating test profile data
 */
export function createMockProfile(overrides: Partial<any> = {}) {
  return {
    id: 'user-1',
    is_admin: false,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Factory for creating test player data
 */
export function createMockPlayer(overrides: Partial<any> = {}) {
  return {
    id: 'player-1',
    name: 'Test Player',
    team_id: 'team-1',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Factory for creating test playoff/bracket data
 */
export function createMockPlayoff(overrides: Partial<any> = {}) {
  return {
    id: 'playoff-1',
    season_id: 'season-1',
    division_id: 'division-1',
    name: 'Test Playoff',
    format: 'single_elimination',
    status: 'pending',
    bracket_data: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}
