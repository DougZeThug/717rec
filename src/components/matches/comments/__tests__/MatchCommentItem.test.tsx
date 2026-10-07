import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

import type { MatchComment } from '@/hooks/matches/useMatchComments';

import MatchCommentItem from '../MatchCommentItem';

const comment = {
  id: 'c1',
  user_id: 'u1',
  username: 'doug',
  team_name: 'Bag Bandits',
  content: 'Nice toss',
} as unknown as MatchComment;

const openDeleteDialog = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
};

describe('MatchCommentItem', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  it('shows the author, team and text of the comment', () => {
    render(<MatchCommentItem comment={comment} onDelete={vi.fn()} />);

    expect(screen.getByText('doug')).toBeInTheDocument();
    expect(screen.getByText('Bag Bandits')).toBeInTheDocument();
    expect(screen.getByText('Nice toss')).toBeInTheDocument();
  });

  it('hides the actions menu from people who did not write the comment', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'someone-else' } });
    render(<MatchCommentItem comment={comment} onDelete={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument();
  });

  it('lets the author cancel the delete without removing the comment', async () => {
    const onDelete = vi.fn();
    render(<MatchCommentItem comment={comment} onDelete={onDelete} />);

    await openDeleteDialog();
    expect(await screen.findByText('Delete Comment')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Delete Comment')).not.toBeInTheDocument());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes the comment after the author confirms and shows progress meanwhile', async () => {
    let finishDelete: (ok: boolean) => void = () => undefined;
    const onDelete = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finishDelete = resolve;
        })
    );
    render(<MatchCommentItem comment={comment} onDelete={onDelete} />);

    await openDeleteDialog();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith('c1');
    expect(await screen.findByRole('button', { name: /Deleting/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    finishDelete(true);
    await waitFor(() => expect(screen.queryByText('Delete Comment')).not.toBeInTheDocument());
  });
});
