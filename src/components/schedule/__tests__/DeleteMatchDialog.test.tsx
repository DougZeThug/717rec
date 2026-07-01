import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DeleteMatchDialog from '@/components/schedule/DeleteMatchDialog';

describe('DeleteMatchDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the confirmation title and permanent-delete description when open', () => {
    render(<DeleteMatchDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(
      screen.getByText(/this will permanently delete the match from the schedule/i)
    ).toBeInTheDocument();
  });

  it('does not render dialog content when closed', () => {
    render(<DeleteMatchDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('fires onConfirm when the Delete action is clicked', () => {
    const onConfirm = vi.fn();
    render(<DeleteMatchDialog isOpen onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<DeleteMatchDialog isOpen onClose={onClose} onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('shows the loading branch and disables both buttons when isDeleting', () => {
    render(<DeleteMatchDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} isDeleting />);

    const actionButton = screen.getByRole('button', { name: /deleting/i });
    expect(actionButton).toHaveTextContent('Deleting...');
    expect(actionButton).toBeDisabled();

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
