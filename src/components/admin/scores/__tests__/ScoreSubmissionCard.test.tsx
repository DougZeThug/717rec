import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ScoreSubmission } from '@/hooks/useScoreSubmissions';

import ScoreSubmissionCard from '../ScoreSubmissionCard';

const longName = 'A'.repeat(60) + 'B'.repeat(60);

const submission = {
  id: 'submission-1',
  match_id: 'match-1',
  submitter_name: longName,
  submitter_team: longName,
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
    team1: { id: 'team-1', name: longName },
    team2: { id: 'team-2', name: 'Hawks' },
  },
} satisfies ScoreSubmission;

describe('ScoreSubmissionCard', () => {
  // jsdom does no layout, so this pins the classes. A 120-character name with no spaces has no
  // break point: it ran past a 320px card unless the value may shrink and break anywhere.
  it('lets a long name or team with no spaces break inside the card', () => {
    render(<ScoreSubmissionCard submission={submission} onApprove={vi.fn()} onReject={vi.fn()} />);

    // The submitter name and the submitter team show the same text.
    for (const value of screen.getAllByText(longName)) {
      expect(value).toHaveClass('min-w-0', 'wrap-break-word');
      expect(value.parentElement).toHaveClass('min-w-0');
    }
    expect(screen.getAllByText(longName)).toHaveLength(2);

    const match = screen.getByText(`${longName} vs Hawks`);
    expect(match.parentElement).toHaveClass('min-w-0', 'wrap-break-word');
  });
});
