import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockHandleSave = vi.fn();
const mockHandleToggleByeStatus = vi.fn();
const mockOnClose = vi.fn();

type Opponent = { id: number; team_id: string; name: string; score: number; result: string | null };
type MockMatchData = {
  id: number;
  status: number;
  opponent1: Opponent | null;
  opponent2: Opponent | null;
  games: unknown[];
};
interface MockEditorState {
  matchData: MockMatchData | null;
  isLoading: boolean;
  error: Error | null;
  opponent1Score: number;
  setOpponent1Score: ReturnType<typeof vi.fn>;
  opponent2Score: number;
  setOpponent2Score: ReturnType<typeof vi.fn>;
  isSaving: boolean;
  isTogglingStatus: boolean;
  byeEligible: null;
  handleSave: ReturnType<typeof vi.fn>;
  handleToggleByeStatus: ReturnType<typeof vi.fn>;
}

// Mutable factory to override per-test
let mockEditorState: MockEditorState = {
  matchData: null,
  isLoading: false,
  error: null,
  opponent1Score: 0,
  setOpponent1Score: vi.fn(),
  opponent2Score: 0,
  setOpponent2Score: vi.fn(),
  isSaving: false,
  isTogglingStatus: false,
  byeEligible: null,
  handleSave: mockHandleSave,
  handleToggleByeStatus: mockHandleToggleByeStatus,
};

vi.mock('@/components/playoffs/match-score-editor/useMatchEditorState', () => ({
  useMatchEditorState: () => mockEditorState,
}));

vi.mock('@/hooks/playoffs/usePlayoffTeams', () => ({
  usePlayoffTeams: () => ({ data: [] }),
}));

vi.mock('@/components/playoffs/admin/EditMatchParticipantsDialog', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="edit-participants-dialog" /> : null,
}));

vi.mock('@/components/playoffs/match-score-editor/ByeMatchEditor', () => ({
  ByeMatchEditor: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="bye-match-editor">
      <button data-testid="bye-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('@/components/playoffs/match-score-editor/RegularMatchEditor', () => ({
  RegularMatchEditor: ({
    opponent1Name,
    opponent2Name,
    canEditTeams,
    onEditTeams,
    onClose,
  }: {
    opponent1Name: string;
    opponent2Name: string;
    canEditTeams: boolean;
    onEditTeams: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="regular-match-editor" data-can-edit-teams={String(canEditTeams)}>
      <span data-testid="opp1-name">{opponent1Name}</span>
      <span data-testid="opp2-name">{opponent2Name}</span>
      <button data-testid="edit-teams-btn" onClick={onEditTeams}>
        Edit Teams
      </button>
      <button data-testid="regular-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

// Inline Dialog mock so portals render in the test tree
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { BracketsManagerMatchEditor } from '../BracketsManagerMatchEditor';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultEditorState = {
  matchData: null,
  isLoading: false,
  error: null,
  opponent1Score: 0,
  setOpponent1Score: vi.fn(),
  opponent2Score: 0,
  setOpponent2Score: vi.fn(),
  isSaving: false,
  isTogglingStatus: false,
  byeEligible: null,
  handleSave: mockHandleSave,
  handleToggleByeStatus: mockHandleToggleByeStatus,
};

const makeMatchData = (overrides: Partial<MockMatchData> = {}): MockMatchData => ({
  id: 5,
  status: 1,
  opponent1: { id: 1, team_id: 't1', name: 'Team One', score: 0, result: null },
  opponent2: { id: 2, team_id: 't2', name: 'Team Two', score: 0, result: null },
  games: [],
  ...overrides,
});

const defaultProps = {
  matchId: 5,
  bracketId: 'bracket-1',
  isOpen: true,
  onClose: mockOnClose,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BracketsManagerMatchEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorState = { ...defaultEditorState };
  });

  it('does not render when isOpen is false', () => {
    mockEditorState = { ...defaultEditorState, matchData: makeMatchData() };
    render(<BracketsManagerMatchEditor {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders loading spinner when isLoading is true', () => {
    mockEditorState = { ...defaultEditorState, isLoading: true };
    render(<BracketsManagerMatchEditor {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders error message when error is truthy and matchData is null', () => {
    mockEditorState = { ...defaultEditorState, error: new Error('Not found'), matchData: null };
    render(<BracketsManagerMatchEditor {...defaultProps} />);

    expect(screen.getByText('Failed to load match data. Please try again.')).toBeInTheDocument();
  });

  it('renders error message when matchData is null and no error', () => {
    mockEditorState = { ...defaultEditorState, matchData: null };
    render(<BracketsManagerMatchEditor {...defaultProps} />);

    expect(screen.getByText('Failed to load match data. Please try again.')).toBeInTheDocument();
  });

  describe('BYE match', () => {
    it('renders ByeMatchEditor when opponent2 is missing', () => {
      mockEditorState = {
        ...defaultEditorState,
        matchData: makeMatchData({ opponent2: null }),
      };
      render(<BracketsManagerMatchEditor {...defaultProps} />);

      expect(screen.getByTestId('bye-match-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('regular-match-editor')).not.toBeInTheDocument();
    });

    it('renders ByeMatchEditor when opponent1 is missing', () => {
      mockEditorState = {
        ...defaultEditorState,
        matchData: makeMatchData({ opponent1: null }),
      };
      render(<BracketsManagerMatchEditor {...defaultProps} />);

      expect(screen.getByTestId('bye-match-editor')).toBeInTheDocument();
    });
  });

  describe('regular match', () => {
    it('renders RegularMatchEditor when both opponents are present', () => {
      mockEditorState = { ...defaultEditorState, matchData: makeMatchData() };
      render(<BracketsManagerMatchEditor {...defaultProps} />);

      expect(screen.getByTestId('regular-match-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('bye-match-editor')).not.toBeInTheDocument();
    });

    it('passes opponent names to RegularMatchEditor', () => {
      mockEditorState = { ...defaultEditorState, matchData: makeMatchData() };
      render(<BracketsManagerMatchEditor {...defaultProps} />);

      expect(screen.getByTestId('opp1-name').textContent).toBe('Team One');
      expect(screen.getByTestId('opp2-name').textContent).toBe('Team Two');
    });

    it('canEditTeams is true when status !== 4 and no result set', () => {
      mockEditorState = {
        ...defaultEditorState,
        matchData: makeMatchData({ status: 1 }),
      };
      render(<BracketsManagerMatchEditor {...defaultProps} />);

      expect(screen.getByTestId('regular-match-editor').dataset.canEditTeams).toBe('true');
    });

    it('canEditTeams is false when status === 4', () => {
      mockEditorState = {
        ...defaultEditorState,
        matchData: makeMatchData({ status: 4 }),
      };
      render(<BracketsManagerMatchEditor {...defaultProps} />);

      expect(screen.getByTestId('regular-match-editor').dataset.canEditTeams).toBe('false');
    });

    it('canEditTeams is false when opponent1 has result win', () => {
      mockEditorState = {
        ...defaultEditorState,
        matchData: makeMatchData({
          opponent1: { id: 1, team_id: 't1', name: 'Team One', score: 2, result: 'win' },
        }),
      };
      render(<BracketsManagerMatchEditor {...defaultProps} />);

      expect(screen.getByTestId('regular-match-editor').dataset.canEditTeams).toBe('false');
    });
  });

  describe('onClose', () => {
    it('passes onClose through to ByeMatchEditor', () => {
      mockEditorState = {
        ...defaultEditorState,
        matchData: makeMatchData({ opponent2: null }),
      };
      render(<BracketsManagerMatchEditor {...defaultProps} onClose={mockOnClose} />);

      screen.getByTestId('bye-close').click();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('passes onClose through to RegularMatchEditor', () => {
      mockEditorState = { ...defaultEditorState, matchData: makeMatchData() };
      render(<BracketsManagerMatchEditor {...defaultProps} onClose={mockOnClose} />);

      screen.getByTestId('regular-close').click();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
