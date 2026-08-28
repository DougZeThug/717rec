import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const setup = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) => {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Delete this message?"
      description="This cannot be undone."
      onConfirm={onConfirm}
      {...props}
    />
  );
  return { onConfirm, onOpenChange };
};

describe('ConfirmDialog', () => {
  it('does not act until the confirm button is pressed', async () => {
    const { onConfirm } = setup();

    expect(screen.getByText('Delete this message?')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes without acting when cancelled', async () => {
    const { onConfirm, onOpenChange } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables both buttons while the action runs', () => {
    setup({ isPending: true });

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Deleting/ })).toBeDisabled();
  });

  it('cannot be dismissed while the action runs', async () => {
    const { onOpenChange } = setup({ isPending: true });

    await userEvent.keyboard('{Escape}');

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('uses the labels the caller supplies', () => {
    setup({ confirmLabel: 'Change division', cancelLabel: 'Keep it', variant: 'default' });

    expect(screen.getByRole('button', { name: 'Change division' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
  });
});
