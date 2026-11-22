import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ByeMatchEditor } from '../ByeMatchEditor';
import type { ByeEligibility } from '../useMatchEditorState';

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

const readyByeEligibility: ByeEligibility = {
  canToggle: true,
  currentStatus: 2,
  statusName: 'Ready',
};

describe('ByeMatchEditor', () => {
  const defaultProps = {
    byeWinner: { name: 'Team One' },
    hasOpponent1: true,
    opponent1Score: 0,
    opponent2Score: 0,
    setOpponent1Score: vi.fn(),
    setOpponent2Score: vi.fn(),
    byeEligible: readyByeEligibility,
    isSaving: false,
    isTogglingStatus: false,
    onSave: vi.fn(),
    onClose: vi.fn(),
    onToggleByeStatus: vi.fn(),
    canEdit: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers Edit teams (for example to fill the BYE), with the reason when disabled', () => {
    const onEditTeams = vi.fn();
    const { rerender } = render(
      <ByeMatchEditor {...defaultProps} onEditTeams={onEditTeams} canEditTeams />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit teams/i }));
    expect(onEditTeams).toHaveBeenCalledTimes(1);

    rerender(
      <ByeMatchEditor
        {...defaultProps}
        onEditTeams={onEditTeams}
        canEditTeams={false}
        editTeamsBlockedReason="Edit teams only works on first-round matches of the winners bracket."
      />
    );
    expect(screen.getByRole('button', { name: /edit teams/i })).toBeDisabled();
    expect(
      screen.getByText(
        'Edit teams: Edit teams only works on first-round matches of the winners bracket.'
      )
    ).toBeInTheDocument();
  });

  it('describes the dialog for screen readers', () => {
    render(<ByeMatchEditor {...defaultProps} />);

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      "Set the winner's score for this BYE match, or change its status."
    );
  });

  it('asks phones for the number pad on the winner score', () => {
    render(<ByeMatchEditor {...defaultProps} />);

    expect(screen.getByLabelText('Team One Score (Games Won)')).toHaveAttribute(
      'inputmode',
      'numeric'
    );
  });

  it('clamps negative BYE winner score to 0', () => {
    render(<ByeMatchEditor {...defaultProps} />);

    const input = screen.getByLabelText('Team One Score (Games Won)');
    fireEvent.change(input, { target: { value: '-5' } });

    expect(defaultProps.setOpponent1Score).toHaveBeenLastCalledWith(0);
    expect(defaultProps.setOpponent2Score).toHaveBeenLastCalledWith(0);
  });

  it('accepts positive BYE winner score unchanged', () => {
    render(<ByeMatchEditor {...defaultProps} />);

    const input = screen.getByLabelText('Team One Score (Games Won)');
    fireEvent.change(input, { target: { value: '2' } });

    expect(defaultProps.setOpponent1Score).toHaveBeenLastCalledWith(2);
    expect(defaultProps.setOpponent2Score).toHaveBeenLastCalledWith(0);
  });

  it('clamps negative score when winner is opponent2', () => {
    render(
      <ByeMatchEditor {...defaultProps} byeWinner={{ name: 'Team Two' }} hasOpponent1={false} />
    );

    const input = screen.getByLabelText('Team Two Score (Games Won)');
    fireEvent.change(input, { target: { value: '-3' } });

    expect(defaultProps.setOpponent2Score).toHaveBeenLastCalledWith(0);
    expect(defaultProps.setOpponent1Score).toHaveBeenLastCalledWith(0);
  });

  describe('status control', () => {
    const eligibleAt = (currentStatus: number, statusName: string): ByeEligibility => ({
      canToggle: true,
      currentStatus,
      statusName,
    });

    it.each([
      [0, 'Locked'],
      [1, 'Waiting'],
    ])('offers "Unlock to Ready" for status %i (%s)', (status, statusName) => {
      render(<ByeMatchEditor {...defaultProps} byeEligible={eligibleAt(status, statusName)} />);

      expect(screen.getByRole('button', { name: /unlock to ready/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /revert to waiting/i })).not.toBeInTheDocument();
    });

    // Ready is the reported bug: reopening the dialog used to hide this control
    // entirely, so an unlocked BYE match could never be put back.
    it.each([
      [2, 'Ready'],
      [3, 'Running'],
    ])('offers "Revert to Waiting" for status %i (%s)', (status, statusName) => {
      render(<ByeMatchEditor {...defaultProps} byeEligible={eligibleAt(status, statusName)} />);

      expect(screen.getByRole('button', { name: /revert to waiting/i })).toBeInTheDocument();
      // Running must never be offered an "unlock", which would downgrade it.
      expect(screen.queryByRole('button', { name: /unlock to ready/i })).not.toBeInTheDocument();
    });

    it('offers both reopen paths for status 4 (Completed)', () => {
      render(<ByeMatchEditor {...defaultProps} byeEligible={eligibleAt(4, 'Completed')} />);

      expect(screen.getByRole('button', { name: /reopen \(safe\)/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reopen \+ clear downstream/i })
      ).toBeInTheDocument();
    });

    it('reverts without clearing downstream', () => {
      render(<ByeMatchEditor {...defaultProps} byeEligible={eligibleAt(2, 'Ready')} />);

      fireEvent.click(screen.getByRole('button', { name: /revert to waiting/i }));

      expect(defaultProps.onToggleByeStatus).toHaveBeenCalledWith(false);
    });

    it('hides the control entirely when the match is not eligible', () => {
      render(
        <ByeMatchEditor
          {...defaultProps}
          byeEligible={{ canToggle: false, currentStatus: 5, statusName: 'Archived' }}
        />
      );

      expect(screen.queryByText('Match Status Control')).not.toBeInTheDocument();
    });
    it('reopens safely, or clears downstream after a confirm, from a completed zombie match', async () => {
      render(<ByeMatchEditor {...defaultProps} byeEligible={eligibleAt(4, 'Completed')} />);

      fireEvent.click(screen.getByRole('button', { name: /reopen \(safe\)/i }));
      expect(defaultProps.onToggleByeStatus).toHaveBeenLastCalledWith(false);

      fireEvent.click(screen.getByRole('button', { name: /reopen \+ clear downstream/i }));
      // Clearing downstream is destructive: nothing happens until it is confirmed.
      expect(defaultProps.onToggleByeStatus).toHaveBeenCalledTimes(1);
      fireEvent.click(await screen.findByRole('button', { name: 'Reopen and clear' }));
      await waitFor(() => expect(defaultProps.onToggleByeStatus).toHaveBeenLastCalledWith(true));
      // The question closes once the reset has finished.
      await waitFor(() =>
        expect(screen.queryByText('Clear the later matches?')).not.toBeInTheDocument()
      );
    });

    it('does not clear downstream when the confirm is cancelled', async () => {
      render(<ByeMatchEditor {...defaultProps} byeEligible={eligibleAt(4, 'Completed')} />);

      fireEvent.click(screen.getByRole('button', { name: /reopen \+ clear downstream/i }));
      expect(await screen.findByText('Clear the later matches?')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() =>
        expect(screen.queryByText('Clear the later matches?')).not.toBeInTheDocument()
      );
      expect(defaultProps.onToggleByeStatus).not.toHaveBeenCalled();
    });

    it('unlocks a locked match', () => {
      render(<ByeMatchEditor {...defaultProps} byeEligible={eligibleAt(0, 'Locked')} />);

      fireEvent.click(screen.getByRole('button', { name: /unlock to ready/i }));

      expect(defaultProps.onToggleByeStatus).toHaveBeenCalledWith(false);
    });

    it('disables the status button while a change is being saved', () => {
      render(
        <ByeMatchEditor {...defaultProps} isTogglingStatus byeEligible={eligibleAt(1, 'Waiting')} />
      );

      expect(screen.getByRole('button', { name: /unlock to ready/i })).toBeDisabled();
    });

    it.each([
      [0, /currently locked/i],
      [2, /match is ready/i],
      [3, /bye match is in progress/i],
      [4, /zombie state/i],
    ])('explains what status %i means', (status, text) => {
      render(<ByeMatchEditor {...defaultProps} byeEligible={eligibleAt(status, 'x')} />);

      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });

  describe('admin view', () => {
    it('shows Award Win and the Cancel button, and no read-only wording', () => {
      render(<ByeMatchEditor {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Award Win' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
      expect(screen.queryByText(/only admins can save scores/i)).not.toBeInTheDocument();
    });
  });

  // A signed-out visitor or a non-admin. Even with a match that can be toggled,
  // none of the bracket-changing buttons may show.
  describe('read-only view (canEdit is false)', () => {
    const readOnlyProps = {
      ...defaultProps,
      canEdit: false,
      opponent1Score: 2,
      byeEligible: { canToggle: true, currentStatus: 4, statusName: 'Completed' },
    };

    it('hides every status button and the status block', () => {
      render(<ByeMatchEditor {...readOnlyProps} />);

      expect(screen.queryByText('Match Status Control')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reopen/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /unlock to ready/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /revert to waiting/i })).not.toBeInTheDocument();
    });

    it('hides the score box and Award Win, and shows the score as text', () => {
      render(<ByeMatchEditor {...readOnlyProps} />);

      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Award Win' })).not.toBeInTheDocument();
      expect(screen.getByText('Team One wins by walkover')).toBeInTheDocument();
      expect(screen.getByText('Team One Score (Games Won)')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows the score of opponent 2 when opponent 2 is the winner', () => {
      render(
        <ByeMatchEditor
          {...readOnlyProps}
          byeWinner={{ name: 'Team Two' }}
          hasOpponent1={false}
          opponent1Score={0}
          opponent2Score={2}
        />
      );

      expect(screen.getByText('Team Two Score (Games Won)')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not offer Edit teams or Move team', () => {
      render(
        <ByeMatchEditor
          {...readOnlyProps}
          onEditTeams={vi.fn()}
          onSwapTeams={vi.fn()}
          canEditTeams
        />
      );

      expect(screen.queryByRole('button', { name: /edit teams/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /move team/i })).not.toBeInTheDocument();
    });

    it('says only admins can save, describes the pop-up, and closes through Close', () => {
      render(<ByeMatchEditor {...readOnlyProps} />);

      expect(
        screen.getByText('Only admins can save scores. Sign in as an admin to edit.')
      ).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
        'Scores for this match. Only admins can change them.'
      );
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      expect(screen.queryByText(/editable/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('uses the saved status when there is no toggle information', () => {
      render(<ByeMatchEditor {...readOnlyProps} byeEligible={null} status={4} />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('stays silent while the admin check runs, and offers a retry when it failed', () => {
      const onRetryAccessCheck = vi.fn();
      const { rerender } = render(<ByeMatchEditor {...readOnlyProps} accessLoading />);
      expect(screen.queryByText(/only admins can save scores/i)).not.toBeInTheDocument();

      rerender(
        <ByeMatchEditor
          {...readOnlyProps}
          accessCheckFailed
          onRetryAccessCheck={onRetryAccessCheck}
        />
      );
      expect(screen.getByText('Could not check admin access.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(onRetryAccessCheck).toHaveBeenCalledTimes(1);
    });
  });
});
