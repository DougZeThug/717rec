import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  eligibility: vi.fn(),
  options: vi.fn(),
  preview: vi.fn(),
}));
vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: {
    checkEditTeamsEligibility: mocks.eligibility,
    getEditTeamsOptions: mocks.options,
    previewEditMatchTeams: mocks.preview,
  },
}));

import { useEditTeamsEligibility, useEditTeamsOptions, useEditTeamsPreview } from '../useEditTeams';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const params = {
  matchId: 5,
  opponent1: { kind: 'team' as const, teamId: 'a' },
  opponent2: { kind: 'bye' as const },
  expectedOpponent1Id: 1,
  expectedOpponent2Id: 2,
};

describe('Edit teams hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads eligibility, options and a preview for the match', async () => {
    mocks.eligibility.mockResolvedValue({ ok: true, reason: null });
    mocks.options.mockResolvedValue({ ok: true, candidates: [] });
    mocks.preview.mockResolvedValue({ ok: true, problems: [], changes: [], consequences: [] });

    const eligibility = renderHook(() => useEditTeamsEligibility(5), { wrapper });
    const options = renderHook(() => useEditTeamsOptions(5), { wrapper });
    const preview = renderHook(() => useEditTeamsPreview(params), { wrapper });

    await waitFor(() =>
      expect(eligibility.result.current.data).toEqual({ ok: true, reason: null })
    );
    await waitFor(() => expect(options.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(preview.result.current.isSuccess).toBe(true));
    expect(mocks.eligibility).toHaveBeenCalledWith(5);
    expect(mocks.options).toHaveBeenCalledWith(5);
    expect(mocks.preview).toHaveBeenCalledWith(params);
  });

  it('stays idle without a match or picks', () => {
    renderHook(() => useEditTeamsEligibility(null), { wrapper });
    renderHook(() => useEditTeamsOptions(null), { wrapper });
    renderHook(() => useEditTeamsPreview(null), { wrapper });
    expect(mocks.eligibility).not.toHaveBeenCalled();
    expect(mocks.options).not.toHaveBeenCalled();
    expect(mocks.preview).not.toHaveBeenCalled();
  });
});
