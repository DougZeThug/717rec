import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockToast = vi.fn();
const mockUploadTeamImage = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({
    divisions: [
      { id: 'division-east', name: 'East Division' },
      { id: 'division-west', name: 'West Division' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/imageUpload', () => ({
  uploadTeamImage: (file: File, teamId?: string) => mockUploadTeamImage(file, teamId),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import TeamForm from '../TeamForm';

const existingTeam = {
  id: 'team-1',
  name: 'Existing Eagles',
  imageUrl: 'https://example.com/eagles.png',
  players: ['Ada', 'Grace'],
  wins: 7,
  losses: 3,
  division_id: 'division-east',
  created_at: '2026-01-01T00:00:00Z',
};

describe('TeamForm', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadTeamImage.mockResolvedValue('https://example.com/uploaded.png');
  });

  it('renders create mode with empty defaults and available divisions', async () => {
    const user = userEvent.setup();

    render(<TeamForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/team name/i)).toHaveValue('');
    expect(screen.getByPlaceholderText(/player 1 name/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /upload image/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /create team/i })).toBeEnabled();

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByRole('option', { name: 'None' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'East Division' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'West Division' })).toBeInTheDocument();
  });

  it('renders edit mode with existing team values', () => {
    render(<TeamForm team={existingTeam} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/team name/i)).toHaveValue('Existing Eagles');
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Grace')).toBeInTheDocument();
    expect(screen.getByAltText(/team preview/i)).toHaveAttribute('src', existingTeam.imageUrl);
    expect(screen.getByRole('button', { name: /update team/i })).toBeEnabled();
  });

  it('shows required-field validation before submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TeamForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /create team/i }));

    expect(await screen.findByText('Team name is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the expected create payload with division, players, and uploaded image', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });

    render(<TeamForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/team name/i), 'New Ninjas');
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'West Division' }));
    await user.type(screen.getByPlaceholderText(/player 1 name/i), 'Maya');
    await user.click(screen.getByRole('button', { name: /add player/i }));
    await user.type(screen.getByPlaceholderText(/player 2 name/i), 'Noor');
    await user.upload(screen.getByLabelText(/upload team image/i), file);

    await waitFor(() => expect(mockUploadTeamImage).toHaveBeenCalled());
    expect(mockUploadTeamImage.mock.calls[0]?.[0]).toBe(file);
    await waitFor(() =>
      expect(screen.getByAltText(/team preview/i)).toHaveAttribute(
        'src',
        'https://example.com/uploaded.png'
      )
    );

    await user.click(screen.getByRole('button', { name: /create team/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'New Ninjas',
      imageUrl: 'https://example.com/uploaded.png',
      players: ['Maya', 'Noor'],
      wins: 0,
      losses: 0,
      division_id: 'division-west',
    });
  });

  it('submits the expected edit payload and preserves existing record stats', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TeamForm team={existingTeam} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.clear(screen.getByLabelText(/team name/i));
    await user.type(screen.getByLabelText(/team name/i), 'Updated Eagles');
    await user.click(screen.getByRole('button', { name: /update team/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Updated Eagles',
      imageUrl: existingTeam.imageUrl,
      players: ['Ada', 'Grace'],
      wins: 7,
      losses: 3,
      division_id: 'division-east',
    });
  });

  it('shows upload failure feedback and does not keep buttons disabled', async () => {
    const user = userEvent.setup();
    const file = new File(['bad-logo'], 'bad-logo.png', { type: 'image/png' });
    mockUploadTeamImage.mockRejectedValueOnce(new Error('Upload failed'));

    render(<TeamForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.upload(screen.getByLabelText(/upload team image/i), file);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Image Upload Failed',
          variant: 'destructive',
        })
      );
    });
    expect(screen.getByRole('button', { name: /upload image/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /create team/i })).toBeEnabled();
  });

  it('disables upload and submit controls while an image is uploading', async () => {
    let resolveUpload: (value: string) => void = () => undefined;
    mockUploadTeamImage.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveUpload = resolve;
      })
    );

    render(<TeamForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/upload team image/i), {
      target: { files: [new File(['logo'], 'logo.png', { type: 'image/png' })] },
    });

    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled();

    resolveUpload('https://example.com/done.png');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /upload image/i })).toBeEnabled()
    );
    expect(screen.getByRole('button', { name: /create team/i })).toBeEnabled();
  });
});
