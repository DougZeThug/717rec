import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ByeMatchEditor } from '../ByeMatchEditor';
import type { ByeEligibility } from '../useMatchEditorState';

// Inline Dialog mock so portals render in the test tree
vi.mock('@/components/ui/dialog', () => ({
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
  });
});
