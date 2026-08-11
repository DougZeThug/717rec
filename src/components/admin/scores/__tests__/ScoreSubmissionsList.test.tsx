import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ScoreSubmissionsList from '../ScoreSubmissionsList';

afterEach(() => vi.resetAllMocks());

describe('ScoreSubmissionsList', () => {
  it('shows the empty state', () => {
    render(<ScoreSubmissionsList submissions={[]} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('No pending score submissions to review.')).toBeInTheDocument();
  });

  it('shows submission data and sends its id to each confirm action', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ScoreSubmissionsList
        submissions={[
          {
            id: 'submission-1',
            submitter_name: 'Pat',
            submitter_team: 'Owls',
            message: 'Owls won 2-1',
            created_at: '2026-01-01T12:00:00Z',
          } as never,
        ]}
        onApprove={onApprove}
        onReject={onReject}
      />
    );
    expect(screen.getByText('Owls won 2-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    fireEvent.click(screen.getByRole('button', { name: /reject/i }));
    expect(onApprove).toHaveBeenCalledWith('submission-1');
    expect(onReject).toHaveBeenCalledWith('submission-1');
  });
});
