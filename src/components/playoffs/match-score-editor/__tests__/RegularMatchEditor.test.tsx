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
});
