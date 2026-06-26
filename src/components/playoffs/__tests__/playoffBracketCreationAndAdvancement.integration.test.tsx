import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import PlayoffDialogs from '@/components/playoffs/dialogs/PlayoffDialogs';
import AdminView from '@/components/playoffs/views/AdminView';
import { createBracket } from '@/services/bracket-creator';
import { fetchBmMatchWithStage } from '@/services/brackets/BracketReadService';
import { Team } from '@/types';
import type { PlayoffMatch } from '@/utils/playoffs/playoffTypes';

const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockUpdateMatch = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/playoffs/usePlayoffState', () => ({
  usePlayoffState: vi.fn(),
}));

vi.mock('@/hooks/playoffs/usePlayoffBracketData', () => ({
  usePlayoffBracketData: vi.fn(() => ({ data: null, isLoading: false, isError: false })),
}));

vi.mock('@/hooks/playoffs/useOptimisticScoreMutation', () => ({
  useOptimisticScoreMutation: vi.fn(() => ({
    applyOptimisticUpdate: vi.fn(),
    rollback: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
  })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/services/bracket-creator', () => ({
  createBracket: vi.fn(),
}));

vi.mock('@/services/brackets/validation/BracketValidationService', () => ({
  BracketValidationService: {
    validateFormData: vi.fn(() => ({ isValid: true, errors: [] })),
  },
}));

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBmMatchWithStage: vi.fn(),
  fetchPlayoffBracketData: vi.fn(),
  fetchPlayoffMatchWithBracket: vi.fn(),
}));

vi.mock('@/hooks/playoffs/usePlayoffMatchUpdate', () => ({
  usePlayoffMatchUpdate: () => ({ updateMatch: mockUpdateMatch }),
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  playoffLog: vi.fn(),
  scoreLog: vi.fn(),
  warnLog: vi.fn(),
  validationLog: vi.fn(),
}));

const divisions = [{ id: 'division-a', name: 'Competitive', display_division: 'Competitive' }];

const teams: Team[] = [
  {
    id: 'team-alpha',
    name: 'Alpha Aces',
    division_id: 'division-a',
    divisionName: 'Competitive',
    wins: 9,
    losses: 1,
    power_score: 91,
    seed: 1,
  },
  {
    id: 'team-bravo',
    name: 'Bravo Bears',
    division_id: 'division-a',
    divisionName: 'Competitive',
    wins: 8,
    losses: 2,
    power_score: 87,
    seed: 2,
  },
];

const firstRoundMatch: PlayoffMatch = {
  id: '101',
  bracket_id: 'created-bracket-1',
  round: 1,
  position: 1,
  team1Id: 'team-alpha',
  team2Id: 'team-bravo',
  winnerId: null,
  loserId: null,
  team1Score: 0,
  team2Score: 0,
  team1GameWins: 0,
  team2GameWins: 0,
  team1Seed: 1,
  team2Seed: 2,
  matchType: 'winners',
  bestOf: 3,
  nextWinMatchId: null,
  nextLoseMatchId: null,
  status: 'pending',
};

function IntegrationHarness() {
  const [bracketDialogOpen, setBracketDialogOpen] = React.useState(false);
  const [editingMatch, setEditingMatch] = React.useState<PlayoffMatch | null>(null);
  const [championId, setChampionId] = React.useState<string | null>(null);
  const [selectedBracketId, setSelectedBracketId] = React.useState<string | null>(null);

  return (
    <>
      <AdminView
        bracketDialogOpen={bracketDialogOpen}
        setBracketDialogOpen={setBracketDialogOpen}
        onCreateBracket={() => setBracketDialogOpen(true)}
        onDeleteBracket={vi.fn()}
        data={{
          ready: true,
          selectedBracketId,
          setSelectedBracketId,
          bracket: null,
          teams,
          availableDivisions: [],
          typesafeBracketsByDivision: {},
          isLoading: false,
        }}
      />

      {selectedBracketId && (
        <section aria-label="Created bracket state">
          <h2>Created bracket is visible</h2>
          <button type="button" onClick={() => setEditingMatch(firstRoundMatch)}>
            Edit Alpha Aces vs Bravo Bears
          </button>
          <div aria-label="Champion state">
            {championId
              ? `Champion: ${teams.find((team) => team.id === championId)?.name}`
              : 'Champion: TBD'}
          </div>
        </section>
      )}

      <PlayoffDialogs
        teamDialogOpen={false}
        setTeamDialogOpen={vi.fn()}
        teamsByDivision={{ Competitive: teams }}
        availableDivisions={['Competitive']}
        teamsLoading={false}
        onTeamDivisionChange={vi.fn()}
        bracketDialogOpen={bracketDialogOpen}
        setBracketDialogOpen={setBracketDialogOpen}
        divisions={divisions}
        teams={teams}
        onBracketCreated={() => setSelectedBracketId('created-bracket-1')}
        seasonId="season-2026"
        editingMatch={editingMatch}
        isQuickEdit
        onCloseMatchEditor={() => setEditingMatch(null)}
        onSaveMatchScore={async (...args) => {
          const [matchId, team1Score, team2Score, games, team1GameWins, team2GameWins, refetch] =
            args;
          await mockUpdateMatch(
            matchId,
            team1Score,
            team2Score,
            games,
            team1GameWins,
            team2GameWins
          );
          if (team1GameWins > team2GameWins) setChampionId(firstRoundMatch.team1Id ?? null);
          if (team2GameWins > team1GameWins) setChampionId(firstRoundMatch.team2Id ?? null);
          await refetch();
          setEditingMatch(null);
        }}
        deletingBracket={null}
        setDeletingBracket={vi.fn()}
        onConfirmDelete={vi.fn()}
        isDeleting={false}
      />
    </>
  );
}

function renderIntegration() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <IntegrationHarness />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('playoff bracket creation and match advancement integration', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const ResizeObserverMock = vi.fn(function ResizeObserverMock() {
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    });
    globalThis.ResizeObserver =
      globalThis.ResizeObserver || (ResizeObserverMock as unknown as typeof ResizeObserver);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(createBracket).mockResolvedValue({
      id: 'created-bracket-1',
      name: 'Competitive Playoff',
      division_id: 'division-a',
      format: 'doubleElim',
      season_id: 'season-2026',
      created_at: '2026-06-26T00:00:00.000Z',
      updated_at: '2026-06-26T00:00:00.000Z',
      status: 'in_progress',
      challonge_url: null,
      challonge_tournament_id: null,
      champion_id: null,
      grand_final_type: 'simple',
      uses_brackets_manager: true,
    });
    vi.mocked(fetchBmMatchWithStage).mockResolvedValue({
      id: 101,
      opponent1_id: 'team-alpha',
      opponent2_id: 'team-bravo',
      opponent1_score: 0,
      opponent2_score: 0,
      round_id: 1,
      number: 1,
      child_count: 3,
      status: 2,
      stage: {
        id: 1,
        tournament_id: 'created-bracket-1',
        name: 'Main',
        type: 'single_elimination',
        number: 1,
      },
    });
  });

  it('creates a bracket from the production form and advances the winner through score entry', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderIntegration();

    await user.click(screen.getByRole('button', { name: /create first bracket/i }));
    await user.type(screen.getByPlaceholderText(/enter bracket title/i), 'Competitive Playoff');

    await user.click(screen.getByRole('combobox', { name: /division/i }));
    await user.click(await screen.findByRole('option', { name: /competitive/i }));

    await user.click(screen.getByRole('button', { name: /alpha aces/i }));
    await user.click(screen.getByRole('button', { name: /bravo bears/i }));
    const createButton = await screen.findByRole('button', { name: /create bracket \(2 teams\)/i });
    await waitFor(() => expect(createButton).toBeEnabled());
    await user.click(createButton);
    await waitFor(() => {
      expect(createBracket).toHaveBeenCalled();
      expect(vi.mocked(createBracket).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          name: 'Competitive Playoff',
          format: 'doubleElim',
          divisionId: 'division-a',
          seasonId: 'season-2026',
          teams: [
            { id: 'team-alpha', name: 'Alpha Aces', seed: undefined },
            { id: 'team-bravo', name: 'Bravo Bears', seed: undefined },
          ],
        })
      );
    });

    expect(await screen.findByText(/created bracket is visible/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/champion state/i)).toHaveTextContent('Champion: TBD');

    await user.click(screen.getByRole('button', { name: /edit alpha aces vs bravo bears/i }));
    const scoreDialog = await screen.findByRole('dialog');
    await user.click(within(scoreDialog).getByRole('button', { name: /2-0/i }));

    await waitFor(() => {
      expect(mockUpdateMatch).toHaveBeenCalledWith('101', 1, 0, expect.any(Array), 2, 0);
    });
    expect(screen.getByLabelText(/champion state/i)).toHaveTextContent('Champion: Alpha Aces');
  });
});
