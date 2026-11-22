import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegularMatchEditor } from '../RegularMatchEditor';

// Inline Dialog mock so portals render in the test tree
vi.mock('@/components/ui/dialog', () => ({
  // Keep the link a real dialog makes between itself and its description.
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog" aria-describedby="mock-dialog-description">
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p id="mock-dialog-description">{children}</p>
  ),
}));

describe('RegularMatchEditor', () => {
  const defaultProps = {
    opponent1Name: 'Team One',
    opponent2Name: 'Team Two',
    opponent1Score: 0,
    opponent2Score: 0,
    setOpponent1Score: vi.fn(),
    setOpponent2Score: vi.fn(),
    games: [],
    isSaving: false,
    onSave: vi.fn(),
    onClose: vi.fn(),
    canEdit: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows why Edit teams is disabled, as text', () => {
    const onEditTeams = vi.fn();
    render(
      <RegularMatchEditor
        {...defaultProps}
        onEditTeams={onEditTeams}
        canEditTeams={false}
        editTeamsBlockedReason="This match is being played, so its teams can't change."
      />
    );

    expect(screen.getByRole('button', { name: /edit teams/i })).toBeDisabled();
    expect(
      screen.getByText("Edit teams: This match is being played, so its teams can't change.")
    ).toBeInTheDocument();
  });

  it('opens Edit teams when it is allowed', () => {
    const onEditTeams = vi.fn();
    render(<RegularMatchEditor {...defaultProps} onEditTeams={onEditTeams} canEditTeams />);

    fireEvent.click(screen.getByRole('button', { name: /edit teams/i }));
    expect(onEditTeams).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/^Edit teams:/)).not.toBeInTheDocument();
  });

  it('lists each game with its score, using a dash for a score not entered yet', () => {
    render(
      <RegularMatchEditor
        {...defaultProps}
        games={[
          { id: 1, number: 1, opponent1_score: 21, opponent2_score: 15 },
          { id: 2, number: 2, opponent1_score: null, opponent2_score: null },
        ]}
      />
    );

    expect(screen.getByText('Game 1:')).toBeInTheDocument();
    expect(screen.getByText('21 - 15')).toBeInTheDocument();
    expect(screen.getByText('Game 2:')).toBeInTheDocument();
    expect(screen.getByText('- - -')).toBeInTheDocument();
  });

  it('describes the dialog for screen readers', () => {
    render(<RegularMatchEditor {...defaultProps} />);

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      'Enter the score for each team, then save.'
    );
  });

  it('asks phones for the number pad on both score inputs', () => {
    render(<RegularMatchEditor {...defaultProps} />);

    expect(screen.getByLabelText('Team One Score')).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText('Team Two Score')).toHaveAttribute('inputmode', 'numeric');
  });

  it('clamps negative team 1 score to 0', () => {
    render(<RegularMatchEditor {...defaultProps} />);

    const input = screen.getByLabelText('Team One Score');
    fireEvent.change(input, { target: { value: '-5' } });

    expect(defaultProps.setOpponent1Score).toHaveBeenLastCalledWith(0);
  });

  it('clamps negative team 2 score to 0', () => {
    render(<RegularMatchEditor {...defaultProps} />);

    const input = screen.getByLabelText('Team Two Score');
    fireEvent.change(input, { target: { value: '-3' } });

    expect(defaultProps.setOpponent2Score).toHaveBeenLastCalledWith(0);
  });

  it('accepts positive scores unchanged', () => {
    render(<RegularMatchEditor {...defaultProps} />);

    const input = screen.getByLabelText('Team One Score');
    fireEvent.change(input, { target: { value: '21' } });

    expect(defaultProps.setOpponent1Score).toHaveBeenLastCalledWith(21);
  });

  it('defaults empty input to 0', () => {
    render(<RegularMatchEditor {...defaultProps} />);

    const input = screen.getByLabelText('Team One Score');
    fireEvent.change(input, { target: { value: '' } });

    expect(defaultProps.setOpponent1Score).toHaveBeenLastCalledWith(0);
  });

  describe('admin view', () => {
    it('shows the score boxes, Save and Cancel, and no read-only wording', () => {
      render(<RegularMatchEditor {...defaultProps} status={2} />);

      expect(screen.getByRole('heading', { name: 'Edit Match Score' })).toBeInTheDocument();
      expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
      expect(screen.queryByText(/only admins can save scores/i)).not.toBeInTheDocument();
      expect(screen.getByText('• Editable now')).toBeInTheDocument();
    });
  });

  // A signed-out visitor or a non-admin. The database refuses their write
  // without an error, so Save here would show "saved" and bring the old score back.
  describe('read-only view (canEdit is false)', () => {
    const readOnlyProps = {
      ...defaultProps,
      canEdit: false,
      opponent1Score: 2,
      opponent2Score: 1,
      status: 4,
    };

    it('shows names and scores as text, with no score boxes and no Save', () => {
      render(<RegularMatchEditor {...readOnlyProps} />);

      expect(screen.getByText('Team One')).toBeInTheDocument();
      expect(screen.getByText('Team Two')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });

    it('titles and describes the pop-up as a read-only view', () => {
      render(<RegularMatchEditor {...readOnlyProps} />);

      expect(screen.getByRole('heading', { name: 'Match Score' })).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
        'Scores for this match. Only admins can change them.'
      );
    });

    it('says only admins can save, and closes through a Close button', () => {
      render(<RegularMatchEditor {...readOnlyProps} />);

      expect(
        screen.getByText('Only admins can save scores. Sign in as an admin to edit.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not offer Edit teams or Move team', () => {
      render(
        <RegularMatchEditor
          {...readOnlyProps}
          onEditTeams={vi.fn()}
          onSwapTeams={vi.fn()}
          canEditTeams
        />
      );

      expect(screen.queryByRole('button', { name: /edit teams/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /move team/i })).not.toBeInTheDocument();
    });

    it('keeps the game list and drops the editing wording from the status', () => {
      render(
        <RegularMatchEditor
          {...readOnlyProps}
          games={[{ id: 1, number: 1, opponent1_score: 21, opponent2_score: 15 }]}
        />
      );

      expect(screen.getByText('21 - 15')).toBeInTheDocument();
      expect(screen.queryByText(/editable/i)).not.toBeInTheDocument();
      expect(screen.getByText('Final score recorded')).toBeInTheDocument();
    });

    it('stays silent while the admin check is still running', () => {
      render(<RegularMatchEditor {...readOnlyProps} accessLoading />);

      expect(screen.queryByText(/only admins can save scores/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });

    it('says the check failed and retries it, instead of saying "only admins"', () => {
      const onRetryAccessCheck = vi.fn();
      render(
        <RegularMatchEditor
          {...readOnlyProps}
          accessCheckFailed
          onRetryAccessCheck={onRetryAccessCheck}
        />
      );

      expect(screen.getByText('Could not check admin access.')).toBeInTheDocument();
      expect(screen.queryByText(/only admins can save scores/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(onRetryAccessCheck).toHaveBeenCalledTimes(1);
    });
  });
});
