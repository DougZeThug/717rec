import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EditModeToolbar from '../EditModeToolbar';

const setup = (props: Partial<React.ComponentProps<typeof EditModeToolbar>> = {}) => {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const onReset = vi.fn();
  render(
    <EditModeToolbar
      hasChanges
      isSaving={false}
      changeCount={2}
      onSave={onSave}
      onCancel={onCancel}
      onReset={onReset}
      {...props}
    />
  );
  return { onSave, onCancel, onReset };
};

describe('EditModeToolbar', () => {
  it('counts the unsaved changes and offers Reset, Cancel and Save Changes', () => {
    setup({ changeCount: 2 });

    expect(screen.getByText('2 unsaved changes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
  });

  it('says "1 unsaved change" in the singular', () => {
    setup({ changeCount: 1 });

    expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
  });

  it('has no Reset and cannot save when nothing changed', () => {
    setup({ hasChanges: false, changeCount: 0 });

    expect(screen.getByText('No changes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
  });

  it('calls the matching handler for each button', async () => {
    const { onSave, onCancel, onReset } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows Saving... and locks every button while it saves', () => {
    setup({ isSaving: true });

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('lets the buttons wrap onto a second line on a phone, but not from 640px up', () => {
    setup();

    // Three buttons do not fit on a 390px phone; without wrapping, Save Changes runs off the screen.
    // jsdom does no layout, so this checks the classes that do the wrapping.
    const row = screen.getByRole('button', { name: 'Save Changes' }).parentElement;
    expect(row).toHaveClass('flex-wrap', 'sm:flex-nowrap');
    expect(row).not.toHaveClass('flex-nowrap');
  });

  it('shows the drag hint only from 700px up, so the buttons fit beside it', () => {
    setup();

    // From 640px the buttons stay on one row (above). With the hint beside them, Save Changes
    // ran up to 30px past the toolbar between 640px and 669px. jsdom does no layout, so this
    // checks the classes: hidden by default, shown from 700px, not from `sm` (640px).
    const hint = screen.getByText('Drag teams between divisions to reorganize');
    expect(hint).toHaveClass('hidden', 'min-[700px]:block');
    expect(hint).not.toHaveClass('sm:block');
  });
});
