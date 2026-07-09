import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

type ChannelHandler = (payload: { new: unknown; old: unknown }) => void;

interface CapturedOn {
  config: { event: string; schema: string; table: string; filter?: string };
  handler: ChannelHandler;
}

const capturedOns: CapturedOn[] = [];
let capturedChannelName = '';
const mockDispose = vi.fn();
let capturedOnReconnect: ((isFirst: boolean) => void) | undefined;

vi.mock('@/hooks/realtime/subscribeWithRetry', () => ({
  subscribeWithRetry: (options: {
    build: () => unknown;
    onReconnect?: (isFirst: boolean) => void;
  }) => {
    options.build();
    capturedOnReconnect = options.onReconnect;
    return { dispose: mockDispose };
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: (name: string) => {
      capturedChannelName = name;
      const chain = {
        on: (_type: string, config: CapturedOn['config'], handler: ChannelHandler) => {
          capturedOns.push({ config, handler });
          return chain;
        },
      };
      return chain;
    },
  },
}));

import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';

import { liveScoringKeys } from '../liveScoringKeys';
import { useLiveMatchRealtime } from '../useLiveMatchRealtime';

let queryClient: QueryClient;

const findRoundInsertHandler = (): CapturedOn => {
  const insert = capturedOns.find(
    (o) => o.config.table === 'match_rounds' && o.config.event === 'INSERT'
  );
  if (!insert) throw new Error('No match_rounds INSERT subscription captured');
  return insert;
};

const createWrapper = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  capturedOns.length = 0;
  capturedChannelName = '';
  capturedOnReconnect = undefined;
});

describe('useLiveMatchRealtime', () => {
  it('subscribes to rounds, games, player selections and the match row', () => {
    renderHook(() => useLiveMatchRealtime('match-1'), { wrapper: createWrapper() });

    expect(capturedChannelName).toContain('live-match-match-1');

    const byTable = (table: string) => capturedOns.filter((o) => o.config.table === table);
    expect(
      byTable('match_rounds')
        .map((o) => o.config.event)
        .sort()
    ).toEqual(['DELETE', 'INSERT', 'UPDATE']);
    expect(byTable('match_rounds')[0].config.filter).toBe('match_id=eq.match-1');
    // DELETE events cannot be server-filtered — matched client-side instead.
    const roundDelete = byTable('match_rounds').find((o) => o.config.event === 'DELETE');
    expect(roundDelete?.config.filter).toBeUndefined();
    expect(byTable('games')).toHaveLength(1);
    expect(byTable('games')[0].config.filter).toBe('match_id=eq.match-1');
    expect(byTable('game_players')).toHaveLength(1);
    expect(byTable('matches')[0].config.filter).toBe('id=eq.match-1');
  });

  it('ignores round deletes that belong to a different match', () => {
    renderHook(() => useLiveMatchRealtime('match-1'), { wrapper: createWrapper() });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const roundDelete = capturedOns.find(
      (o) => o.config.table === 'match_rounds' && o.config.event === 'DELETE'
    );
    if (!roundDelete) throw new Error('No match_rounds DELETE subscription captured');

    roundDelete.handler({ new: {}, old: { match_id: 'someone-elses-match' } });
    expect(spy).not.toHaveBeenCalled();

    roundDelete.handler({ new: {}, old: { match_id: 'match-1' } });
    expect(spy).toHaveBeenCalledWith({ queryKey: liveScoringKeys.liveMatch('match-1') });
  });

  it('does not subscribe without a match id', () => {
    renderHook(() => useLiveMatchRealtime(), { wrapper: createWrapper() });
    expect(capturedOns).toHaveLength(0);
  });

  it('invalidates the bundle on a genuine remote round insert', () => {
    renderHook(() => useLiveMatchRealtime('match-1'), { wrapper: createWrapper() });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const insert = findRoundInsertHandler();
    insert.handler({
      new: { game_id: 'game-1', round_number: 3, team1_score: 5, team2_score: 2 },
      old: {},
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: liveScoringKeys.liveMatch('match-1') });
  });

  it('skips the echo of a round that is already in the local cache', () => {
    renderHook(() => useLiveMatchRealtime('match-1'), { wrapper: createWrapper() });
    queryClient.setQueryData(liveScoringKeys.liveMatch('match-1'), {
      match: {},
      games: [],
      gamePlayers: [],
      rounds: [{ game_id: 'game-1', round_number: 3, team1_score: 5, team2_score: 2 }],
    } as unknown as LiveMatchBundle);
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const insert = findRoundInsertHandler();
    insert.handler({
      new: { game_id: 'game-1', round_number: 3, team1_score: 5, team2_score: 2 },
      old: {},
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it('resyncs after a reconnect but not on first connect', () => {
    renderHook(() => useLiveMatchRealtime('match-1'), { wrapper: createWrapper() });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    capturedOnReconnect?.(true);
    expect(spy).not.toHaveBeenCalled();

    capturedOnReconnect?.(false);
    expect(spy).toHaveBeenCalledWith({ queryKey: liveScoringKeys.liveMatch('match-1') });
  });

  it('disposes the subscription on unmount', () => {
    const { unmount } = renderHook(() => useLiveMatchRealtime('match-1'), {
      wrapper: createWrapper(),
    });
    unmount();
    expect(mockDispose).toHaveBeenCalled();
  });
});
