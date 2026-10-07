import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MessageControls from '../MessageControls';

const setup = (overrides: Partial<React.ComponentProps<typeof MessageControls>> = {}) => {
  const props = {
    isAuthor: true,
    showOptions: false,
    isDeleting: false,
    showDeleteConfirm: false,
    setShowDeleteConfirm: vi.fn(),
    setShowOptions: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(undefined), // skipcq: JS-W1042
    onEdit: vi.fn(),
    ...overrides,
  };
  render(<MessageControls {...props} />);
  return props;
};

describe('MessageControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gives the author a visible options button that opens the edit and delete choices', () => {
    const props = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Message options' }));
    expect(props.setShowOptions).toHaveBeenCalledWith(true);
  });

  it('shows nothing for someone who did not write the message', () => {
    setup({ isAuthor: false });

    expect(screen.queryByRole('button', { name: 'Message options' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit message' })).not.toBeInTheDocument();
  });

  it('edits and asks to delete from the open options', () => {
    const props = setup({ showOptions: true });

    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    expect(props.onEdit).toHaveBeenCalledTimes(1);
    expect(props.setShowOptions).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole('button', { name: 'Delete message' }));
    expect(props.setShowDeleteConfirm).toHaveBeenCalledWith(true);
  });

  it('confirms the delete from the dialog', () => {
    const props = setup({ showDeleteConfirm: true });

    expect(screen.getByText('Delete Message')).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('locks both dialog buttons while the delete is running', () => {
    setup({ showDeleteConfirm: true, isDeleting: true });

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
