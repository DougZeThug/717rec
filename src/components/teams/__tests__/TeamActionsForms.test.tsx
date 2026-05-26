import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Team } from '@/types';

const mockUpload = vi.hoisted(() => vi.fn<(file: File, teamId?: string) => Promise<string>>());
const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/utils/imageUpload', () => ({
  uploadTeamImage: (file: File, teamId?: string) => mockUpload(file, teamId),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({ divisions: [], isLoading: false }),
}));

import { TeamDeleteDialog } from '../TeamDeleteDialog';
import { TeamEditForm } from '../TeamEditForm';

const team: Team = { id: 't1', name: 'Old', players: [], wins: 0, losses: 0 } as Team;
const onSubmit = vi.fn<() => Promise<void>>().mockResolvedValue();

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
    const onCancel = vi.fn();
    render(<TeamEditForm team={team} onSubmit={onSubmit} onCancel={onCancel} />);
    await userEvent.clear(screen.getByPlaceholderText(/enter team name/i));
    await userEvent.type(screen.getByPlaceholderText(/enter team name/i), 'New Name');
    await userEvent.click(screen.getByRole('button', { name: /update team/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('handles upload error path deterministically', async () => {
    mockUpload.mockRejectedValueOnce(new Error('nope'));
    render(<TeamEditForm team={team} onSubmit={onSubmit} onCancel={vi.fn()} />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInstanceOf(HTMLInputElement);

    const file = new File(['x'], 'x.png', { type: 'image/png' });
    await userEvent.upload(input as HTMLInputElement, file);
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Image Upload Failed' })
      )
    );
  });

  it('resets form state when switching to a different team via key prop', async () => {
    const teamA: Team = {
      id: 'team-a',
      name: 'Team Alpha',
      players: ['Alice', 'Bob'],
      wins: 0,
      losses: 0,
    } as Team;
    const teamB: Team = {
      id: 'team-b',
      name: 'Team Bravo',
      players: ['Charlie', 'Dave', 'Eve'],
      wins: 0,
      losses: 0,
    } as Team;

    const submit =
      vi.fn<(data: Omit<Team, 'id' | 'created_at'>) => Promise<void>>().mockResolvedValue();

    // Simulate TeamsContainer using key={team.id} to force remount on switch.
    const { rerender } = render(
      <TeamEditForm key={teamA.id} team={teamA} onSubmit={submit} onCancel={vi.fn()} />
    );
    expect(screen.getByPlaceholderText(/enter team name/i)).toHaveValue('Team Alpha');

    rerender(
      <TeamEditForm key={teamB.id} team={teamB} onSubmit={submit} onCancel={vi.fn()} />
    );
    expect(screen.getByPlaceholderText(/enter team name/i)).toHaveValue('Team Bravo');

    await userEvent.click(screen.getByRole('button', { name: /update team/i }));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    const submitted = submit.mock.calls[0][0];
    expect(submitted.name).toBe('Team Bravo');
    expect(submitted.players).toEqual(['Charlie', 'Dave', 'Eve']);
  });
});
