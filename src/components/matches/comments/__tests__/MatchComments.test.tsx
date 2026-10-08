import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseMatchComments = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/matches/useMatchComments', () => ({
  useMatchComments: () => mockUseMatchComments(),
}));
vi.mock('../MatchCommentItem', () => ({
  default: ({ comment }: { comment: { content: string } }) => <p>{comment.content}</p>,
}));
vi.mock('../MatchCommentForm', () => ({
  default: ({ onSubmit }: { onSubmit: (content: string) => Promise<void> }) => (
    <button onClick={() => onSubmit('Great match')}>Post comment</button>
  ),
}));

import MatchComments from '../MatchComments';

const comment = { id: 'c1', content: 'Nice toss', user_id: 'u1' };

const setup = (comments: unknown[], addResult: unknown = true) => {
  const addComment = vi.fn().mockResolvedValue(addResult);
  mockUseMatchComments.mockReturnValue({
    comments,
    isLoading: false,
    addComment,
    deleteComment: vi.fn(),
  });
  return addComment;
};

describe('MatchComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a skeleton while comments load', () => {
    mockUseMatchComments.mockReturnValue({ comments: [], isLoading: true });
    render(<MatchComments matchId="m1" />);

    expect(screen.queryByRole('button', { name: /Comment/ })).not.toBeInTheDocument();
  });

  it('counts comments on the toggle and expands to show them', async () => {
    setup([comment]);
    render(<MatchComments matchId="m1" />);

    await userEvent.click(screen.getByRole('button', { name: '1 Comment' }));

    expect(screen.getByText('Nice toss')).toBeInTheDocument();
  });

  it('uses the plural label when there are no comments', () => {
    setup([]);
    render(<MatchComments matchId="m1" />);

    expect(screen.getByRole('button', { name: '0 Comments' })).toBeInTheDocument();
  });

  it('sends a new comment and keeps the list open', async () => {
    const addComment = setup([]);
    render(<MatchComments matchId="m1" />);
    expect(screen.queryByRole('button', { name: 'Post comment' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '0 Comments' }));
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(addComment).toHaveBeenCalledWith('Great match');
    expect(screen.getByRole('button', { name: '0 Comments' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});
