import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegularMatchEditor } from '../RegularMatchEditor';

// Inline Dialog mock so portals render in the test tree
vi.mock('@/components/ui/dialog', () => ({
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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

  it('clamps negative team 1 score to 0', async () => {
    const user = userEvent.setup();
    render(<RegularMatchEditor {...defaultProps} />);

    const input = screen.getByLabelText('Team One Score');
    await user.clear(input);
    await user.type(input, '-5');

    expect(defaultProps.setOpponent1Score).toHaveBeenLastCalledWith(0);
  });

  it('clamps negative team 2 score to 0', async () => {
    const user = userEvent.setup();
    render(<RegularMatchEditor {...defaultProps} />);

    const input = screen.getByLabelText('Team Two Score');
    await user.clear(input);
    await user.type(input, '-3');

    expect(defaultProps.setOpponent2Score).toHaveBeenLastCalledWith(0);
  });

  it('accepts positive scores unchanged', async () => {
    const user = userEvent.setup();
    render(<RegularMatchEditor {...defaultProps} />);

    const input = screen.getByLabelText('Team One Score');
    await user.clear(input);
    await user.type(input, '21');

    expect(defaultProps.setOpponent1Score).toHaveBeenLastCalledWith(21);
  });

  it('defaults empty input to 0', async () => {
    const user = userEvent.setup();
    render(<RegularMatchEditor {...defaultProps} />);

    const input = screen.getByLabelText('Team One Score');
    await user.clear(input);

    expect(defaultProps.setOpponent1Score).toHaveBeenLastCalledWith(0);
  });
});
