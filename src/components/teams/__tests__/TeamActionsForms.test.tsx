import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockUpload = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/utils/imageUpload', () => ({ uploadTeamImage: (...args: any[]) => mockUpload(...args) }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/hooks/useDivisions', () => ({ useDivisions: () => ({ divisions: [], isLoading: false }) }));

import { TeamDeleteDialog } from '../TeamDeleteDialog';
import { TeamEditForm } from '../TeamEditForm';

describe('Team destructive/edit actions', () => {
  it('delete dialog confirm/cancel branches', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<TeamDeleteDialog isOpen onClose={onClose} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalled();
  });

  it('team edit form submits and cancel works', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<TeamEditForm team={{ id: 't1', name: 'Old', players: [], wins: 0, losses: 0 } as any} onSubmit={onSubmit as any} onCancel={onCancel} />);
    await userEvent.clear(screen.getByPlaceholderText(/enter team name/i));
    await userEvent.type(screen.getByPlaceholderText(/enter team name/i), 'New Name');
    await userEvent.click(screen.getByRole('button', { name: /update team/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('handles upload error path deterministically', async () => {
    mockUpload.mockRejectedValueOnce(new Error('nope'));
    render(<TeamEditForm team={{ id: 't1', name: 'Old', players: [], wins: 0, losses: 0 } as any} onSubmit={vi.fn() as any} onCancel={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'x.png', { type: 'image/png' });
    await userEvent.upload(input, file);
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Image Upload Failed' })));
  });
});
