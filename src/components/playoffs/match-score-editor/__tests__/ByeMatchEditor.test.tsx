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
});
