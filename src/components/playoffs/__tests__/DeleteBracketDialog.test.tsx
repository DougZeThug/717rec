import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DeleteBracketDialog from '../DeleteBracketDialog';

const renderDialog = (props: Partial<React.ComponentProps<typeof DeleteBracketDialog>> = {}) => {
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();
  render(
    <DeleteBracketDialog
      open
      onOpenChange={onOpenChange}
      bracketName="Competitive Playoffs"
      onConfirm={onConfirm}
      isDeleting={false}
      {...props}
    />
  );
  return { onConfirm, onOpenChange };
};

describe('DeleteBracketDialog', () => {
  it('names the bracket and warns that the delete cannot be undone', () => {
    renderDialog();

    expect(screen.getByText('Competitive Playoffs')).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
  });

  it('deletes the bracket when the admin confirms', async () => {
    const { onConfirm } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Bracket' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes without deleting on Cancel', async () => {
    const { onConfirm, onOpenChange } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('locks both buttons while the delete is running', () => {
    renderDialog({ isDeleting: true });

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
