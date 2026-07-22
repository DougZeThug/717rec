import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted keeps these initialised before the hoisted vi.mock factories run.
// Two factories below (MatchWriteService, queryInvalidation) read their mock fn
// eagerly, so a plain `const mock… = vi.fn()` would hit the temporal dead zone
// when MassScoreEntryTool imports those modules.
const {
  mockDeleteMatchWithStatsReversal,
  mockInvalidateAllDataQueries,
  mockToast,
  mockRemoveMatch,
} = vi.hoisted(() => ({
  mockDeleteMatchWithStatsReversal: vi.fn(),
  mockInvalidateAllDataQueries: vi.fn(),
  mockToast: vi.fn(),
  mockRemoveMatch: vi.fn(),
}));

const baseHookState = {
  matches: [
    {
      id: 'm1',
      team1Id: 't1',
      team2Id: 't2',
      team1: { id: 't1', name: 'Alpha' },
      team2: { id: 't2', name: 'Bravo' },
      team1Score: 2,
      team2Score: 0,
      team1_game_wins: 2,
      team2_game_wins: 0,
      iscompleted: true,
      isEdited: false,
      isValid: true,
      date: '2026-03-05T18:00:00.000Z',
    },
  ],
  loading: false,
  submitting: false,
  failedMatches: [] as string[],
  errorMessages: {} as Record<string, string>,
  brackets: [] as { id: string; title: string }[],
  filters: { date: undefined as Date | undefined, bracketId: undefined as string | undefined },
  handleScoreChange: vi.fn(),
  handleGameWinsChange: vi.fn(),
  handleMarkCompleted: vi.fn(),
  handleSubmitAll: vi.fn(),
  clearErrors: vi.fn(),
  setFilterDate: vi.fn(),
  setBracketFilter: vi.fn(),
  clearFilters: vi.fn(),
  removeMatch: mockRemoveMatch,
};

vi.mock('@/services/matches/MatchWriteService', () => ({
  deleteMatchWithStatsReversal: mockDeleteMatchWithStatsReversal,
}));

vi.mock('@/hooks/matches/updates/utils/queryInvalidation', () => ({
  invalidateAllDataQueries: mockInvalidateAllDataQueries,
}));

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));

vi.mock('@/components/admin/mass-score-entry/hooks/useScoreEntryData', () => ({
  useScoreEntryData: () => baseHookState,
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ theme: 'light' }),
  default: () => ({ isWinterTheme: false }),
}));

vi.mock('framer-motion', () => {
  const passthrough = new Proxy(
    {},
    {
      get:
        (_t, tag: string) =>
        ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => {
          const domProps: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(rest)) {
            if (!/^(while|initial|animate|exit|transition|variants|layout)/.test(k))
              domProps[k] = v;
          }
          return React.createElement(tag, domProps, children as React.ReactNode);
        },
    }
  );
  return {
    m: passthrough,
    motion: passthrough,
    AnimatePresence: ({ children }: React.PropsWithChildren) => children,
  };
});

vi.mock('@/components/admin/AdminSectionWrapper', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/admin/mass-score-entry/components/ScoreEntryToolbar', () => ({
  default: () => <div data-testid="toolbar" />,
}));

vi.mock('@/components/admin/mass-score-entry/MatchesTable', () => ({
  default: ({ onDeleteMatch }: { onDeleteMatch: (id: string) => void }) => (
    <button onClick={() => onDeleteMatch('m1')}>delete match</button>
  ),
}));

import MassScoreEntryTool from '../MassScoreEntryTool';

const renderTool = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MassScoreEntryTool />
    </QueryClientProvider>
  );

describe('MassScoreEntryTool delete flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes delete through the atomic RPC, removes the row, and invalidates caches', async () => {
    mockDeleteMatchWithStatsReversal.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderTool();

    await user.click(screen.getByRole('button', { name: /delete match/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() =>
      expect(mockDeleteMatchWithStatsReversal).toHaveBeenCalledExactlyOnceWith('m1')
    );
    expect(mockRemoveMatch).toHaveBeenCalledExactlyOnceWith('m1');
    expect(mockInvalidateAllDataQueries).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Match deleted' }));
  });

  it('on RPC failure: shows destructive toast, does not remove row or invalidate caches', async () => {
    mockDeleteMatchWithStatsReversal.mockRejectedValue(new Error('rpc boom'));
    const user = userEvent.setup();
    renderTool();

    await user.click(screen.getByRole('button', { name: /delete match/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', variant: 'destructive' })
      )
    );
    expect(mockRemoveMatch).not.toHaveBeenCalled();
    expect(mockInvalidateAllDataQueries).not.toHaveBeenCalled();
  });
});
