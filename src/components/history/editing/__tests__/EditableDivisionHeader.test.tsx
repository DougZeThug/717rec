import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EditableDivisionHeader from '../EditableDivisionHeader';

const setup = (props: Partial<React.ComponentProps<typeof EditableDivisionHeader>> = {}) => {
  const onRename = vi.fn();
  const onRemove = vi.fn();
  render(
    <EditableDivisionHeader
      divisionName="Competitive"
      teamCount={0}
      onRename={onRename}
      onRemove={onRemove}
      canRemove
      existingDivisions={['Competitive', 'Intermediate']}
      {...props}
    />
  );
  return { onRename, onRemove };
};

describe('EditableDivisionHeader', () => {
  it('shows the division name with its team count', () => {
    setup({ teamCount: 3 });

    expect(screen.getByRole('heading', { name: 'Competitive' })).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('removes an empty division', async () => {
    const { onRemove } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Remove division' }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('blocks removing a division that still has teams', async () => {
    const { onRemove } = setup({ canRemove: false, teamCount: 2 });
    const remove = screen.getByRole('button', { name: 'Remove division' });

    expect(remove).toBeDisabled();
    await userEvent.click(remove);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('renames a division and leaves edit mode', async () => {
    const { onRename } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Rename division' }));
    const input = screen.getByPlaceholderText('Division name');
    expect(input).toHaveValue('Competitive');
    await userEvent.clear(input);
    await userEvent.type(input, '  Advanced {Enter}');

    expect(onRename).toHaveBeenCalledWith('Advanced');
    expect(screen.getByRole('heading', { name: 'Competitive' })).toBeInTheDocument();
  });

  it('rejects an empty name and a name another division already uses', async () => {
    const { onRename } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Rename division' }));
    const input = screen.getByPlaceholderText('Division name');
    await userEvent.clear(input);
    await userEvent.click(screen.getByRole('button', { name: 'Save division name' }));
    expect(screen.getByText('Division name cannot be empty')).toBeInTheDocument();

    await userEvent.type(input, 'intermediate');
    await userEvent.click(screen.getByRole('button', { name: 'Save division name' }));
    expect(screen.getByText('A division with this name already exists')).toBeInTheDocument();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('cancels a rename with the button or the Escape key', async () => {
    const { onRename } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Rename division' }));
    await userEvent.type(screen.getByPlaceholderText('Division name'), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel renaming' }));
    expect(screen.getByRole('heading', { name: 'Competitive' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Rename division' }));
    await userEvent.type(screen.getByPlaceholderText('Division name'), 'Y{Escape}');
    expect(screen.getByRole('heading', { name: 'Competitive' })).toBeInTheDocument();
    expect(onRename).not.toHaveBeenCalled();
  });
});
