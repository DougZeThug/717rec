import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CareerPreviewRow } from '@/hooks/admin/buildCareerWeightPreview';
import type { SeasonDivisionPreview } from '@/hooks/admin/buildSeasonWeightPreview';

const mockState = vi.fn();
const mockPreview = vi.fn();
const mockApply = vi.fn();
const mockRevert = vi.fn();

interface StateLike {
  current?: { win_weight: number; sos_weight: number; game_weight: number } | null;
}

vi.mock('@/hooks/admin/usePowerWeightSandbox', () => ({
  usePowerWeightState: () => mockState(),
  usePowerWeightPreview: (candidate: unknown, state: unknown) => mockPreview(candidate, state),
  useApplyPowerWeights: () => mockApply(),
  useRevertPowerWeights: () => mockRevert(),
  baselineWeights: (state?: StateLike) =>
    state?.current
      ? {
          win: state.current.win_weight,
          sos: state.current.sos_weight,
          game: state.current.game_weight,
        }
      : { win: 40, sos: 45, game: 15 },
}));

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
// The shared Table component reads the seasonal theme, which needs a Router
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ theme: 'light' }),
}));

import PowerScoreSandboxTab from '../PowerScoreSandboxTab';

const queryResult = (overrides: object = {}) => ({
  data: undefined,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});

const mutationResult = (overrides: object = {}) => ({
  mutateAsync: vi.fn().mockResolvedValue({ status: 'applied', seasonRows: 116 }),
  isPending: false,
  ...overrides,
});

const weightRow = (id: number, win: number, sos: number, game: number) => ({
  id,
  win_weight: win,
  sos_weight: sos,
  game_weight: game,
  applied_at: '2026-08-20T12:00:00Z',
  note: null,
});

const appliedState = {
  controlsApplied: true,
  current: weightRow(2, 40, 45, 15),
  previous: weightRow(1, 50, 35, 15),
};

const seasonPreview: SeasonDivisionPreview[] = [
  {
    divisionName: 'Competitive',
    rows: [
      {
        teamId: 'a',
        teamName: 'Alpha',
        baselineScore: 83,
        candidateScore: 81,
        baselineRank: 1,
        candidateRank: 2,
        rankDelta: -1,
        scoreDelta: -2,
      },
    ],
    unrated: [{ teamId: 'c', teamName: 'Charlie' }],
  },
  {
    divisionName: 'Hidden',
    rows: [
      {
        teamId: 'h',
        teamName: 'Hush',
        baselineScore: 60,
        candidateScore: 60,
        baselineRank: 1,
        candidateRank: 1,
        rankDelta: 0,
        scoreDelta: 0,
      },
    ],
    unrated: [],
  },
];

const careerPreview: CareerPreviewRow[] = [
  {
    teamId: 'b',
    teamName: 'Bravo',
    divisionName: 'Competitive',
    baselineScore: 79.5,
    candidateScore: 83.5,
    baselineRank: 2,
    candidateRank: 1,
    rankDelta: 1,
    scoreDelta: 4,
  },
];

const previewData = { season: seasonPreview, career: careerPreview };

describe('PowerScoreSandboxTab', () => {
  beforeAll(() => {
    // Radix AlertDialog/Tabs need pointer-capture APIs jsdom doesn't implement
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.mockReturnValue(queryResult({ data: appliedState }));
    mockPreview.mockReturnValue(queryResult({ data: previewData }));
    mockApply.mockReturnValue(mutationResult());
    mockRevert.mockReturnValue(mutationResult());
  });

  it('shows the friendly not-applied card with Save locked, previews still on', () => {
    mockState.mockReturnValue(
      queryResult({ data: { controlsApplied: false, current: null, previous: null } })
    );
    render(<PowerScoreSandboxTab />);

    expect(screen.getByText(/aren't on the live database yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/couldn't/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save & rescore/i })).toBeDisabled();
    // The preview still renders against the default weights
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    // No history → no revert
    expect(screen.queryByRole('button', { name: /revert/i })).not.toBeInTheDocument();
  });

  it('renders the live-weights banner and the season preview, hiding the Hidden division', () => {
    render(<PowerScoreSandboxTab />);

    expect(screen.getByText(/live weights: 40\/45\/15/i)).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText(/not rated yet/i)).toHaveTextContent('Charlie');
    expect(screen.queryByText('Hush')).not.toBeInTheDocument();
  });

  it('switches to the career preview tab', async () => {
    render(<PowerScoreSandboxTab />);

    const user = userEvent.setup();
    expect(screen.queryByText('Bravo')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /career/i }));
    expect(await screen.findByText('Bravo')).toBeInTheDocument();
  });

  it('keeps Save disabled while the weights are unchanged', () => {
    render(<PowerScoreSandboxTab />);
    expect(screen.getByRole('button', { name: /save & rescore/i })).toBeDisabled();
  });

  it('enables Save after an edit (with Balance SOS) and applies through the dialog', async () => {
    const applyMutation = mutationResult();
    mockApply.mockReturnValue(applyMutation);
    render(<PowerScoreSandboxTab />);

    const user = userEvent.setup();
    const winInput = screen.getByLabelText(/match wins/i);
    await user.clear(winInput);
    await user.type(winInput, '50');
    await user.click(screen.getByRole('button', { name: /balance sos/i }));

    const saveButton = screen.getByRole('button', { name: /save & rescore/i });
    await waitFor(() => expect(saveButton).toBeEnabled());

    await user.click(saveButton);
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/from 40\/45\/15 to 50\/35\/15/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/archived seasons included/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /^save$/i }));
    await waitFor(() =>
      expect(applyMutation.mutateAsync).toHaveBeenCalledWith({
        weights: { win: 50, sos: 35, game: 15 },
      })
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('offers Revert to the previous triple and runs it through its own dialog', async () => {
    const revertMutation = mutationResult({
      mutateAsync: vi.fn().mockResolvedValue({ status: 'reverted', seasonRows: 116 }),
    });
    mockRevert.mockReturnValue(revertMutation);
    render(<PowerScoreSandboxTab />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /revert to 50\/35\/15/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/go back to the 50\/35\/15 weights/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^revert$/i }));
    await waitFor(() => expect(revertMutation.mutateAsync).toHaveBeenCalledTimes(1));
  });

  it('hides Revert when there is no previous triple', () => {
    mockState.mockReturnValue(queryResult({ data: { ...appliedState, previous: null } }));
    render(<PowerScoreSandboxTab />);
    expect(screen.queryByRole('button', { name: /revert/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no earlier weights to revert to/i)).toBeInTheDocument();
  });

  it('keeps the dialog open and shows the failure when saving fails', async () => {
    const applyMutation = mutationResult({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Admin access required')),
    });
    mockApply.mockReturnValue(applyMutation);
    render(<PowerScoreSandboxTab />);

    const user = userEvent.setup();
    const winInput = screen.getByLabelText(/match wins/i);
    await user.clear(winInput);
    await user.type(winInput, '50');
    await user.click(screen.getByRole('button', { name: /balance sos/i }));
    const saveButton = screen.getByRole('button', { name: /save & rescore/i });
    await waitFor(() => expect(saveButton).toBeEnabled());

    await user.click(saveButton);
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(applyMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    const { toast } = await import('@/hooks/useToast');
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
    );
  });
});
