import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockScriptIsReady = true;
let mockScriptError: string | null = null;
let mockIsInitialized = true;
let mockRenderError: string | null = null;
const mockGetPlayoffMatchIdRef = { current: vi.fn() };

type MockMatch = { id: number; opponent1: { id: string } | null; opponent2: { id: string } | null };

// Capture the onMatchClicked callback passed by the component
let capturedOnMatchClicked: ((match: MockMatch) => void) | null = null;

vi.mock('@/components/playoffs/viewer/useBracketsViewerScript', () => ({
  useBracketsViewerScript: () => ({
    isReady: mockScriptIsReady,
    error: mockScriptError,
  }),
}));

vi.mock('@/components/playoffs/viewer/useBracketsViewerRenderer', () => ({
  useBracketsViewerRenderer: (opts: { onMatchClicked?: (match: MockMatch) => void; [key: string]: unknown }) => {
    capturedOnMatchClicked = opts.onMatchClicked ?? null;
    return {
      isInitialized: mockIsInitialized,
      error: mockRenderError,
      getPlayoffMatchIdRef: mockGetPlayoffMatchIdRef,
    };
  },
}));

vi.mock('@/components/playoffs/match-score-editor/BracketsManagerMatchEditor', () => ({
  BracketsManagerMatchEditor: ({
    isOpen,
    matchId,
    onClose,
    onSaved,
  }: {
    isOpen: boolean;
    matchId: number | null;
    onClose: () => void;
    onSaved?: () => void;
  }) =>
    isOpen ? (
      <div data-testid="bm-editor" data-match-id={String(matchId)}>
        <button data-testid="bm-close" onClick={onClose}>
          Close
        </button>
        <button data-testid="bm-saved" onClick={onSaved}>
          Saved
        </button>
      </div>
    ) : null,
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
}));

vi.mock('@/components/ui/loading-state', () => ({
  LoadingState: ({ message }: { message: string }) => (
    <div data-testid="loading-state">{message}</div>
  ),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { BracketsViewerComponent } from '../BracketsViewerComponent';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeBracket = (overrides: Partial<PlayoffBracket> = {}): PlayoffBracket & {
  bracket_data?: unknown;
} => ({
  id: 'bracket-1',
  name: 'Championship',
  format: 'single_elimination',
  status: 'active',
  division_id: null,
  season_id: 'season-1',
  created_at: '2025-01-01T00:00:00Z',
  uses_brackets_manager: false,
  ...overrides,
});

const makeTeam = (id: string): PlayoffTeam => ({
  id,
  name: `Team ${id}`,
  seed: 1,
  logoUrl: null,
});

const teams = [makeTeam('t1'), makeTeam('t2')];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BracketsViewerComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnMatchClicked = null;
    mockScriptIsReady = true;
    mockScriptError = null;
    mockIsInitialized = true;
    mockRenderError = null;
    mockGetPlayoffMatchIdRef.current = vi.fn();
  });

  describe('guard conditions', () => {
    it('renders error when bracket has no id', () => {
      render(
        <BracketsViewerComponent
          bracket={{ ...makeBracket(), id: '' } as unknown as PlayoffBracket}
          teams={teams}
        />,
      );
      expect(screen.getByText('Cannot render bracket: Invalid data')).toBeInTheDocument();
    });

    it('renders "No bracket data available" when teams array is empty', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={[]} />);
      expect(screen.getByText('No bracket data available')).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('renders script error message', () => {
      mockScriptError = 'Script failed to load';
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      expect(screen.getByText(/Error loading bracket/)).toBeInTheDocument();
    });

    it('renders render error message', () => {
      mockRenderError = 'Render failed';
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      expect(screen.getByText(/Error loading bracket/)).toBeInTheDocument();
    });
  });

  describe('valid bracket rendering', () => {
    it('renders the bracket region with accessible aria-label', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      expect(
        screen.getByRole('region', { name: /Playoff Bracket: Championship/i }),
      ).toBeInTheDocument();
    });

    it('shows loading state when not initialized', () => {
      mockIsInitialized = false;
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });

    it('does not show loading state when initialized', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
  });

  describe('match click handling', () => {
    it('does not crash when no onMatchClick callback is provided', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);

      expect(() => {
        act(() => {
          capturedOnMatchClicked?.({ id: 5, opponent1: { id: 't1' }, opponent2: { id: 't2' } });
        });
      }).not.toThrow();
    });

    it('blocks click when both opponents are null', () => {
      const mockOnMatchClick = vi.fn();
      render(
        <BracketsViewerComponent
          bracket={makeBracket()}
          teams={teams}
          onMatchClick={mockOnMatchClick}
        />,
      );

      act(() => {
        capturedOnMatchClicked?.({ id: 5, opponent1: null, opponent2: null });
      });

      expect(mockOnMatchClick).not.toHaveBeenCalled();
    });

    it('opens BracketsManagerMatchEditor for brackets-manager brackets', async () => {
      const bmBracket = makeBracket({ uses_brackets_manager: true });
      const mockOnMatchClick = vi.fn();

      render(
        <BracketsViewerComponent
          bracket={bmBracket}
          teams={teams}
          onMatchClick={mockOnMatchClick}
        />,
      );

      act(() => {
        capturedOnMatchClicked?.({ id: 7, opponent1: { id: 't1' }, opponent2: null });
      });

      expect(await screen.findByTestId('bm-editor')).toBeInTheDocument();
      expect(screen.getByTestId('bm-editor').dataset.matchId).toBe('7');
    });

    it('calls onMatchClick with mapped playoff match ID for legacy brackets', () => {
      const mockOnMatchClick = vi.fn();
      mockGetPlayoffMatchIdRef.current.mockReturnValue('playoff-match-42');

      render(
        <BracketsViewerComponent
          bracket={makeBracket({ uses_brackets_manager: false })}
          teams={teams}
          onMatchClick={mockOnMatchClick}
        />,
      );

      act(() => {
        capturedOnMatchClicked?.({ id: 9, opponent1: { id: 't1' }, opponent2: { id: 't2' } });
      });

      expect(mockOnMatchClick).toHaveBeenCalledWith('playoff-match-42');
    });

    it('does not call onMatchClick when legacy ID mapping returns null', () => {
      const mockOnMatchClick = vi.fn();
      mockGetPlayoffMatchIdRef.current.mockReturnValue(null);

      render(
        <BracketsViewerComponent
          bracket={makeBracket({ uses_brackets_manager: false })}
          teams={teams}
          onMatchClick={mockOnMatchClick}
        />,
      );

      act(() => {
        capturedOnMatchClicked?.({ id: 9, opponent1: { id: 't1' }, opponent2: { id: 't2' } });
      });

      expect(mockOnMatchClick).not.toHaveBeenCalled();
    });
  });

  describe('BracketsManagerMatchEditor lifecycle', () => {
    it('closes editor and clears matchId when onClose is called', async () => {
      const bmBracket = makeBracket({ uses_brackets_manager: true });
      render(
        <BracketsViewerComponent
          bracket={bmBracket}
          teams={teams}
          onMatchClick={vi.fn()}
        />,
      );

      // Open the editor
      act(() => {
        capturedOnMatchClicked?.({ id: 3, opponent1: { id: 't1' }, opponent2: null });
      });

      expect(await screen.findByTestId('bm-editor')).toBeInTheDocument();

      // Close it
      act(() => {
        screen.getByTestId('bm-close').click();
      });

      expect(screen.queryByTestId('bm-editor')).not.toBeInTheDocument();
    });
  });
});
