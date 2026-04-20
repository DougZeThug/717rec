import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSubmitScore = vi.fn();

vi.mock('@/hooks/usePendingScoresMatches', () => ({
  usePendingScoresMatches: () => ({
    submitScore: mockSubmitScore,
    isSubmitting: mockIsSubmitting(),
  }),
}));

let mockIsSubmitting = vi.fn(() => false);

vi.mock('../utils', () => ({
  formatDate: (_d: string) => '01/04/2025',
  formatTime: (_d: string) => '6:30 PM',
}));

// Make ResponsiveDialog always render its children so we can test form content
vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { ScoreSubmissionModal } from '../ScoreSubmissionModal';
import { PendingMatch } from '@/hooks/usePendingScoresMatches';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockMatch: PendingMatch = {
  id: 'match-1',
  team1_id: 'team-a',
  team2_id: 'team-b',
  team1_name: 'Team Alpha',
  team2_name: 'Team Beta',
  team1_logo: null,
  team2_logo: null,
  date: '2025-01-04T23:30:00Z',
  location: 'Court 1',
};

const renderModal = (props: Partial<{ open: boolean; onClose: () => void }> = {}) => {
  const onClose = props.onClose ?? vi.fn();
  return {
    onClose,
    ...render(
      <ScoreSubmissionModal
        match={mockMatch}
        open={props.open ?? true}
        onClose={onClose}
      />,
    ),
  };
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ScoreSubmissionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSubmitting = vi.fn(() => false);
    mockSubmitScore.mockResolvedValue(true);
  });

  it('renders team names from the match prop', () => {
    renderModal();
    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
  });

  it('renders formatted date and time', () => {
    renderModal();
    expect(screen.getByText(/01\/04\/2025/)).toBeInTheDocument();
    expect(screen.getByText(/6:30 PM/)).toBeInTheDocument();
  });

  it('renders location when provided', () => {
    renderModal();
    expect(screen.getByText(/Court 1/)).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    renderModal({ open: false });
    expect(screen.queryByText('Team Alpha')).not.toBeInTheDocument();
  });

  it('shows validation error when submitter_name is empty', async () => {
    renderModal();

    // Fill message but leave name empty
    await userEvent.type(
      screen.getByPlaceholderText(/e\.g\., Team Alpha beat/i),
      'Team Alpha won 2-1',
    );

    await userEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText('Your name is required')).toBeInTheDocument();
    });
    expect(mockSubmitScore).not.toHaveBeenCalled();
  });

  it('shows validation error when message is empty', async () => {
    renderModal();

    await userEvent.type(screen.getByPlaceholderText('Enter your name'), 'John Doe');

    await userEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText('Score report is required')).toBeInTheDocument();
    });
    expect(mockSubmitScore).not.toHaveBeenCalled();
  });

  it('calls submitScore with match id and form data on valid submit', async () => {
    renderModal();

    await userEvent.type(screen.getByPlaceholderText('Enter your name'), 'John Doe');
    // Use exact placeholder to avoid matching the longer message textarea
    await userEvent.type(screen.getByPlaceholderText('e.g., Team Alpha'), 'Team Alpha');
    await userEvent.type(
      screen.getByPlaceholderText(/e\.g\., Team Alpha beat/i),
      'Team Alpha won 2-1',
    );

    await userEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(mockSubmitScore).toHaveBeenCalledWith('match-1', {
        submitter_name: 'John Doe',
        submitter_team: 'Team Alpha',
        message: 'Team Alpha won 2-1',
      });
    });
  });

  it('calls onClose after successful submission', async () => {
    const { onClose } = renderModal();

    await userEvent.type(screen.getByPlaceholderText('Enter your name'), 'Jane');
    await userEvent.type(
      screen.getByPlaceholderText(/e\.g\., Team Alpha beat/i),
      'Great match, 2-1',
    );

    await userEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('does not call onClose when submitScore returns false', async () => {
    mockSubmitScore.mockResolvedValue(false);
    const { onClose } = renderModal();

    await userEvent.type(screen.getByPlaceholderText('Enter your name'), 'Jane');
    await userEvent.type(
      screen.getByPlaceholderText(/e\.g\., Team Alpha beat/i),
      'Great match, 2-1',
    );

    await userEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(mockSubmitScore).toHaveBeenCalled();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancel button calls onClose', async () => {
    const { onClose } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables Submit and Cancel when isSubmitting is true', () => {
    mockIsSubmitting = vi.fn(() => true);

    render(
      <ScoreSubmissionModal match={mockMatch} open={true} onClose={vi.fn()} />,
    );

    // Button text changes to "Submitting..." when isSubmitting is true
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});
