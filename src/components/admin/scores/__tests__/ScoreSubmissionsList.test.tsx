import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ScoreSubmission } from '@/hooks/useScoreSubmissions';

import ScoreSubmissionsList from '../ScoreSubmissionsList';

afterEach(() => vi.resetAllMocks());

const submission = {
  id: 'submission-1',
  match_id: 'match-1',
  submitter_name: 'Pat',
  submitter_team: 'Owls',
  message: 'Owls won 2-1',
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

describe('ScoreSubmissionsList', () => {
  it('shows the empty state', () => {
    render(<ScoreSubmissionsList submissions={[]} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('No pending score submissions to review.')).toBeInTheDocument();
  });

  it('shows which match the report is about', () => {
    render(
      <ScoreSubmissionsList submissions={[submission]} onApprove={vi.fn()} onReject={vi.fn()} />
    );
    expect(screen.getByText('Owls vs Hawks')).toBeInTheDocument();
  });

  it('falls back to a placeholder when the match is missing', () => {
    render(
      <ScoreSubmissionsList
        submissions={[{ ...submission, match: null }]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('Unknown match')).toBeInTheDocument();
  });

  it('sends the whole submission to approve and just the id to reject', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ScoreSubmissionsList submissions={[submission]} onApprove={onApprove} onReject={onReject} />
    );
    expect(screen.getByText('Owls won 2-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    fireEvent.click(screen.getByRole('button', { name: /reject/i }));
    // Approve needs the match and team names to open the result dialog.
    expect(onApprove).toHaveBeenCalledWith(submission);
    expect(onReject).toHaveBeenCalledWith('submission-1');
  });
});
