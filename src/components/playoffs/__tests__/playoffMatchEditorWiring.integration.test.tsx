import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PlayoffPageLayout from '@/components/playoffs/layout/PlayoffPageLayout';
import { fetchBmMatchWithStage } from '@/services/brackets/BracketReadService';
import type { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

// Radix dialogs expect these browser APIs in jsdom.
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  configurable: true,
  value: vi.fn(() => false),
});
Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  configurable: true,
  value: vi.fn(),
});
Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  configurable: true,
  value: vi.fn(),
});
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
});

const MATCH_ID = '42';

// The bracket viewer is the real entry point: it is what calls onEditMatch.
vi.mock('@/components/playoffs/viewer', () => ({
  BracketsViewerComponent: ({ onMatchClick }: { onMatchClick?: (id: string) => void }) => (
    <button onClick={() => onMatchClick?.(MATCH_ID)}>Edit match score</button>
  ),
}));

// Stub the editors themselves — this test is about whether the dialog opens with
// the right match, not about what the editor renders inside it.
vi.mock('@/components/playoffs/match-score-editor', () => ({
  MatchScoreEditor: ({ match }: { match: { id: string } }) => (
    <div data-testid="match-score-editor">Editing match {match.id}</div>
  ),
  QuickScoreEditor: ({ match }: { match: { id: string } }) => (
    <div data-testid="quick-score-editor">Quick editing match {match.id}</div>
  ),
}));

// Sibling dialogs render nothing so getByRole('dialog') is unambiguous.
vi.mock('@/components/playoffs/BracketCreationDialog', () => ({ default: () => null }));
vi.mock('@/components/playoffs/TeamDivisionDialog', () => ({ default: () => null }));
vi.mock('@/components/playoffs/DeleteBracketDialog', () => ({ default: () => null }));
vi.mock('@/components/playoffs/SeedingUpdateDialog', () => ({ SeedingUpdateDialog: () => null }));
vi.mock('@/components/playoffs/FinalStandings', () => ({ FinalStandings: () => null }));
vi.mock('@/components/playoffs/ChampionDisplay', () => ({ default: () => null }));
vi.mock('@/components/playoffs/PlayoffHeader', () => ({ default: () => null }));
vi.mock('@/components/playoffs/SeasonSelector', () => ({ default: () => null }));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: true }),
}));
vi.mock('@/hooks/brackets/useBracketsManagerRealtime', () => ({
  useBracketsManagerRealtime: () => ({ realtimeEnabled: false, lastUpdate: null }),
}));
vi.mock('@/hooks/brackets/useBracketData', () => ({
  useBracketData: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    loadingProgress: { label: 'Loading bracket', percent: 100 },
  }),
}));
vi.mock('@/hooks/useChallongeFallback', () => ({
  useChallongeFallbackConfig: () => ({ data: { enabled: false } }),
}));
vi.mock('@/hooks/useSeasonalTheme', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useSeasonalTheme: () => ({ shouldApplyWinterBase: false, winterClass: '' }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));
vi.mock('@/hooks/useBracketCompletion', () => ({ useBracketCompletion: vi.fn() }));
vi.mock('@/hooks/useRecalculateStandings', () => ({
  useRecalculateStandings: () => ({ recalculate: vi.fn(), isRecalculating: false }),
}));
vi.mock('@/hooks/useRepairBracket', () => ({
  useRepairBracket: () => ({ repair: vi.fn(), isRepairing: false }),
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/playoffs/usePlayoffMatchUpdate', () => ({
  usePlayoffMatchUpdate: () => ({ updateMatch: vi.fn() }),
}));
vi.mock('@/hooks/playoffs/useOptimisticScoreMutation', () => ({
  useOptimisticScoreMutation: () => ({
    applyOptimisticUpdate: vi.fn(),
    rollback: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
  }),
}));

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBmMatchWithStage: vi.fn(),
  fetchPlayoffMatchWithBracket: vi.fn(),
  fetchBracketInfo: vi.fn(),
  fetchBracketParticipants: vi.fn().mockResolvedValue([]),
  fetchFinalStandings: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() },
}));

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(actual).map((key) => [key, vi.fn()]));
});

const teams = [
  { id: 'team-1', name: 'Alpha', seed: 1 },
  { id: 'team-2', name: 'Bravo', seed: 2 },
];

const bracket: PlayoffBracket = {
  id: 'bracket-1',
  name: 'Rec Championship',
  division: 'Recreational',
  format: 'single_elimination',
  state: 'in_progress',
  champion: undefined,
  matches: [],
};

const makeAdminPageData = () =>
  ({
    profile: null,
    isAdmin: true,
    isLoading: false,
    ready: true,
    selectedBracketId: 'bracket-1',
    setSelectedBracketId: vi.fn(),
    bracket,
    error: null,
    divisionsError: null,
    bracketsError: null,
    selectedBracketError: null,
    retrySelectedBracket: vi.fn(),
    divisions: [],
    divisionsLoading: false,
    availableDivisions: ['Recreational'],
    allBrackets: [],
    bracketsLoading: false,
    teams,
    teamsLoading: false,
    teamsByDivision: {},
    bracketsByDivision: {},
    typesafeBracketsByDivision: { Recreational: [bracket] },
    allBracketsData: [],
    handleBracketCreated: vi.fn(),
    handleTeamDivisionChange: vi.fn(),
    refetchBrackets: vi.fn(),
    deleteBracket: vi.fn(),
    selectedSeasonId: 'season-2026',
    setSelectedSeasonId: vi.fn(),
  }) as unknown as React.ComponentProps<typeof PlayoffPageLayout>['data'];

const renderLayout = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlayoffPageLayout data={makeAdminPageData()} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

/**
 * Guards the wiring between the bracket viewer and the score editor dialog.
 *
 * These live in two different components: AdminView renders the viewer, while
 * PlayoffPageLayout renders the dialog. They only work together if they share one
 * usePlayoffEditMatch instance. When AdminView called usePlayoffHandlers itself it
 * got a private `editingMatch`, so clicking a match set one copy of the state while
 * the dialog watched another and the editor never opened.
 *
 * This renders the real PlayoffPageLayout — mocking usePlayoffHandlers, or driving
 * `editingMatch` from local test state, is exactly what let that regression through.
 */
describe('playoff match editor wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(fetchBmMatchWithStage).mockResolvedValue({
      id: Number(MATCH_ID),
      round_id: 1,
      number: 1,
      status: 2,
      opponent1_id: 1,
      opponent2_id: 2,
      opponent1_score: null,
      opponent2_score: null,
      child_count: 3,
      stage: { tournament_id: 1 },
    } as unknown as Awaited<ReturnType<typeof fetchBmMatchWithStage>>);
  });

  it('opens the score editor when an admin clicks a match', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Edit match score' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('match-score-editor')).toHaveTextContent(`Editing match ${MATCH_ID}`);
    expect(fetchBmMatchWithStage).toHaveBeenCalledWith(Number(MATCH_ID));
  });
});
