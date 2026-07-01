import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ReactionButton from '@/components/message-board/reactions/ReactionButton';

describe('ReactionButton', () => {
  it('renders the emoji, the count, and an accessible label when count > 0', () => {
    render(<ReactionButton emoji="👍" count={3} hasReacted={false} onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: '👍 reaction (3)' });
    expect(button).toBeInTheDocument();
    // The emoji and the numeric count are both visible.
    expect(button).toHaveTextContent('👍');
    expect(button).toHaveTextContent('3');
  });

  it('fires onClick when pressed', () => {
    const onClick = vi.fn();
    render(<ReactionButton emoji="👍" count={3} hasReacted={false} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '👍 reaction (3)' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render the numeric count span when count is 0', () => {
    render(<ReactionButton emoji="🔥" count={0} hasReacted={false} onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: '🔥 reaction (0)' });
    expect(button).toBeInTheDocument();
    // Emoji still present, but no "0" count text is rendered (count > 0 branch skipped).
    expect(button).toHaveTextContent('🔥');
    expect(button).not.toHaveTextContent('0');
  });

  it('reflects the hasReacted state via the accessible label and reacted styling', () => {
    render(<ReactionButton emoji="👍" count={2} hasReacted onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: '👍 reaction (2)' });
    expect(button).toBeInTheDocument();
    // The "reacted" branch applies the accent background class.
    expect(button.className).toContain('bg-accent/30');
  });
});
