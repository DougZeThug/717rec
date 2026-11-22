import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import PlayoffDialogs from '@/components/playoffs/dialogs/PlayoffDialogs';
import AdminView from '@/components/playoffs/views/AdminView';
import { createBracket } from '@/services/bracket-creator';
import { Team } from '@/types';

const mockNavigate = vi.fn();
const mockToast = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
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

/**
 * Drives the page state from local state on purpose: this test covers the
 * bracket creation form, not the page's data wiring.
 */
function IntegrationHarness() {
  const [bracketDialogOpen, setBracketDialogOpen] = React.useState(false);
  const [selectedBracketId, setSelectedBracketId] = React.useState<string | null>(null);

  return (
    <>
      <AdminView
        bracketDialogOpen={bracketDialogOpen}
        setBracketDialogOpen={setBracketDialogOpen}
        onCreateBracket={() => setBracketDialogOpen(true)}
        onDeleteBracket={vi.fn()}
        data={
          {
            ready: true,
            selectedBracketId,
            setSelectedBracketId,
            closeBracket: () => setSelectedBracketId(null),
            bracket: null,
            teams,
            availableDivisions: [],
            typesafeBracketsByDivision: {},
            isLoading: false,
          } as unknown as React.ComponentProps<typeof AdminView>['data']
        }
      />

      {selectedBracketId && (
        <section aria-label="Created bracket state">
          <h2>Created bracket is visible</h2>
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

describe('playoff bracket creation integration', () => {
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
    } as unknown as Awaited<ReturnType<typeof createBracket>>);
  });

  it('creates a bracket from the production form', async () => {
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
  });
});
