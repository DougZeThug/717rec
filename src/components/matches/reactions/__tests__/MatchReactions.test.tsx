import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseMatchReactions = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/matches/useMatchReactions', () => ({
  useMatchReactions: () => mockUseMatchReactions(),
}));
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

import MatchReactions from '../MatchReactions';

const toggleReaction = vi.fn();

const setup = (reactionCounts: { emoji: string; count: number; hasReacted: boolean }[]) =>
  mockUseMatchReactions.mockReturnValue({ reactionCounts, toggleReaction, isLoading: false });

describe('MatchReactions', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  it('shows only a placeholder while reactions load', () => {
    mockUseMatchReactions.mockReturnValue({ reactionCounts: [], isLoading: true, toggleReaction });
    render(<MatchReactions matchId="m1" />);

    expect(screen.queryByRole('group', { name: 'Match reactions' })).not.toBeInTheDocument();
  });

  it('shows each reaction with its count and toggles it on click', async () => {
    setup([
      { emoji: '👍', count: 3, hasReacted: true },
      { emoji: '🔥', count: 0, hasReacted: false },
    ]);
    render(<MatchReactions matchId="m1" />);

    expect(screen.getByRole('button', { name: '👍 reaction (3)' })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: '🔥 reaction (0)' })).not.toHaveTextContent(/\d/);

    await userEvent.click(screen.getByRole('button', { name: '👍 reaction (3)' }));
    expect(toggleReaction).toHaveBeenCalledWith('👍');
  });

  it('explains what a click does in a tooltip', async () => {
    setup([{ emoji: '👍', count: 1, hasReacted: true }]);
    render(<MatchReactions matchId="m1" />);

    await userEvent.hover(screen.getByRole('button', { name: '👍 reaction (1)' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Remove reaction');
  });

  it('adds a new reaction from the picker', async () => {
    setup([]);
    render(<MatchReactions matchId="m1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Add reaction' }));
    await userEvent.click(await screen.findByRole('button', { name: '🎉' }));

    expect(toggleReaction).toHaveBeenCalledWith('🎉');
  });

  it('asks signed-out visitors to sign in instead of reacting', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    setup([{ emoji: '👍', count: 1, hasReacted: false }]);
    render(<MatchReactions matchId="m1" />);

    await userEvent.click(screen.getByRole('button', { name: '👍 reaction (1)' }));

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sign in required' }));
    expect(toggleReaction).not.toHaveBeenCalled();
  });
});
