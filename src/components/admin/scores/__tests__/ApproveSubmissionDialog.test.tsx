import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Always render the dialog children so the form is testable in jsdom.
vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import type { ScoreSubmission } from '@/hooks/useScoreSubmissions';

import ApproveSubmissionDialog from '../ApproveSubmissionDialog';

const submission = {
  id: 'submission-1',
  match_id: 'match-1',
  submitter_name: 'Pat',
  submitter_team: 'Owls',
  message: 'Owls beat Hawks 2-1',
  status: 'pending',
  created_at: '2026-01-01T12:00:00Z',
  reviewed_by: null,
  reviewed_at: null,
  match: {
    id: 'match-1',
    date: '2026-01-01T00:00:00Z',
    location: 'Lane 1',
    team1_id: 'team-1',
    team2_id: 'team-2',
    team1: { id: 'team-1', name: 'Owls' },
    team2: { id: 'team-2', name: 'Hawks' },
  },
} satisfies ScoreSubmission;

const renderDialog = (overrides: Partial<React.ComponentProps<typeof ApproveSubmissionDialog>>) =>
  render(
    <ApproveSubmissionDialog
      submission={submission}
      open
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      {...overrides}
    />
  );

const confirmButton = () => screen.getByRole('button', { name: /record and approve/i });

describe('ApproveSubmissionDialog', () => {
  it('renders nothing without a submission', () => {
    const { container } = render(
      <ApproveSubmissionDialog submission={null} open onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the match and the reported message so the admin can read the score', () => {
    renderDialog({});
    expect(screen.getByText('Owls vs Hawks')).toBeInTheDocument();
    expect(screen.getByText('Owls beat Hawks 2-1')).toBeInTheDocument();
  });

  it('keeps confirm disabled until a result is picked', async () => {
    const user = userEvent.setup();
    renderDialog({});
    expect(confirmButton()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Owls 2\u20130' }));
    expect(confirmButton()).toBeEnabled();
  });

  it('offers only the four possible best-of-three results', () => {
    renderDialog({});
    // An impossible result such as 0-0 or 3-2 cannot be entered at all.
    ['Owls 2\u20130', 'Owls 2\u20131', 'Hawks 2\u20131', 'Hawks 2\u20130'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('sends the winner and the games each team won', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    await user.click(screen.getByRole('button', { name: 'Owls 2\u20131' }));
    await user.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      submissionId: 'submission-1',
      matchId: 'match-1',
      winner: 1,
      team1GameWins: 2,
      team2GameWins: 1,
    });
  });

  it('sends team 2 as the winner when team 2 took the match', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    await user.click(screen.getByRole('button', { name: 'Hawks 2\u20131' }));
    await user.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ winner: 2, team1GameWins: 1, team2GameWins: 2 })
    );
  });

  it('falls back to generic team names when the match is missing', () => {
    renderDialog({ submission: { ...submission, match: null } });
    expect(screen.getByText('Team 1 vs Team 2')).toBeInTheDocument();
  });
});
