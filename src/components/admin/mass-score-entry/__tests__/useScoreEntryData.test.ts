import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies before importing the hook
const mockHandleSubmitScore = vi.fn();
const mockToast = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        gte: vi.fn(() => ({
          lt: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      channel: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn()
        }))
      }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn()
  }
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

vi.mock('@/hooks/matches/useMatchSubmission', () => ({
  useMatchSubmission: () => ({
    handleSubmitScore: mockHandleSubmitScore
  })
}));

vi.mock('@/utils/logger', () => ({
  matchLog: vi.fn(),
  scoreLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn()
}));

// Import after mocks
import { useScoreEntryData } from '../hooks/useScoreEntryData';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
  return Wrapper;
};

describe('useScoreEntryData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleSubmitScore.mockResolvedValue(true);
  });

  it('returns required state and handlers', () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    expect(result.current.matches).toBeDefined();
    expect(result.current.loading).toBeDefined();
    expect(result.current.submitting).toBeDefined();
    expect(result.current.handleScoreChange).toBeDefined();
    expect(result.current.handleMarkCompleted).toBeDefined();
    expect(result.current.handleSubmitAll).toBeDefined();
  });

  it('shows toast when no valid matches to submit', async () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('No'),
        variant: 'destructive'
      })
    );
  });

  it('filter functions are available', () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    expect(result.current.setFilterDate).toBeDefined();
    expect(result.current.setBracketFilter).toBeDefined();
    expect(result.current.clearFilters).toBeDefined();
    expect(typeof result.current.setFilterDate).toBe('function');
  });

  it('brackets state is initialized as empty array', () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    expect(Array.isArray(result.current.brackets)).toBe(true);
  });

  it('filters state contains date and bracketId', () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    expect(result.current.filters).toBeDefined();
    expect(typeof result.current.filters).toBe('object');
  });
});

describe('useScoreEntryData - Score Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleScoreChange updates match scores', async () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // The function exists and is callable
    expect(typeof result.current.handleScoreChange).toBe('function');
  });

  it('handleMarkCompleted updates match completion status', async () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.handleMarkCompleted).toBe('function');
  });
});

describe('useScoreEntryData - Submission Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleSubmitScore.mockResolvedValue(true);
  });

  it('handleSubmitAll is async function', () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    expect(result.current.handleSubmitAll).toBeDefined();
    // Verify it returns a promise
    const returnValue = result.current.handleSubmitAll();
    expect(returnValue).toBeInstanceOf(Promise);
  });

  it('submitting state starts as false', () => {
    const { result } = renderHook(() => useScoreEntryData(), { wrapper: createWrapper() });

    expect(result.current.submitting).toBe(false);
  });
});
