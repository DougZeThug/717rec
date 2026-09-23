import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/components/auth', () => ({
  LoginRequired: ({ message }: { message: string }) => <p>{message}</p>,
}));

import MatchCommentForm from '../MatchCommentForm';

describe('MatchCommentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
  });

  it('asks a signed-out visitor to sign in instead of showing the form', () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<MatchCommentForm onSubmit={vi.fn()} />);

    expect(screen.getByText('Sign in to comment on this match')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Add a comment' })).not.toBeInTheDocument();
  });

  it('keeps Send disabled until the comment has text', async () => {
    render(<MatchCommentForm onSubmit={vi.fn()} />);
    const send = screen.getByRole('button', { name: 'Send comment' });

    expect(send).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Add a comment' }), '   ');
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'Nice toss');
    expect(send).toBeEnabled();
  });

  it('sends the typed comment and clears the box', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MatchCommentForm onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox', { name: 'Add a comment' });

    await userEvent.type(box, 'Great match');
    await userEvent.click(screen.getByRole('button', { name: 'Send comment' }));

    expect(onSubmit).toHaveBeenCalledWith('Great match');
    await waitFor(() => expect(box).toHaveValue(''));
  });
});
