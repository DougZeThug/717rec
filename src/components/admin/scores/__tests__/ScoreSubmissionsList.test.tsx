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
    expect(screen.getByText('No score reports waiting for approval.')).toBeInTheDocument();
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

  it('sends the whole submission to approve, and the id to reject once confirmed', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ScoreSubmissionsList submissions={[submission]} onApprove={onApprove} onReject={onReject} />
    );
    expect(screen.getByText('Owls won 2-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    // Approve needs the match and team names to open the result dialog.
    expect(onApprove).toHaveBeenCalledWith(submission);

    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));
    expect(onReject).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /reject report/i }));
    expect(onReject).toHaveBeenCalledWith('submission-1');
  });

  // A-10: rejecting fired straight into the mutation, and the row vanished.
  it('rejects nothing when the confirmation is dismissed', () => {
    const onReject = vi.fn();
    render(
      <ScoreSubmissionsList submissions={[submission]} onApprove={vi.fn()} onReject={onReject} />
    );

    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));
    expect(screen.getByText('Reject this score report?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onReject).not.toHaveBeenCalled();
  });

  // A-10: two people reporting the same match rendered as unrelated cards, so an
  // admin could approve one without ever seeing the other.
  it('warns when one match has more than one report', () => {
    const second = {
      ...submission,
      id: 'submission-2',
      submitter_name: 'Sam',
      message: 'Hawks won 2-0',
    } satisfies ScoreSubmission;

    render(
      <ScoreSubmissionsList
        submissions={[submission, second]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('2 reports for Owls vs Hawks.')).toBeInTheDocument();
  });

  it('does not warn when each report is for a different match', () => {
    const other = {
      ...submission,
      id: 'submission-3',
      match_id: 'match-2',
      match: { ...submission.match, id: 'match-2' },
    } satisfies ScoreSubmission;

    render(
      <ScoreSubmissionsList
        submissions={[submission, other]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
