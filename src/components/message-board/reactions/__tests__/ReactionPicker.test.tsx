import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReactionPicker from '@/components/message-board/reactions/ReactionPicker';

describe('ReactionPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the picker header, section labels and emoji buttons', () => {
    render(<ReactionPicker onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('Add reaction')).toBeInTheDocument();
    expect(screen.getByText('Positive')).toBeInTheDocument();
    expect(screen.getByText('Neutral')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🔥' })).toBeInTheDocument();
  });

  it('calls onSelect with the chosen emoji', () => {
    const onSelect = vi.fn();
    render(<ReactionPicker onSelect={onSelect} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '🔥' }));
    expect(onSelect).toHaveBeenCalledWith('🔥');
  });

  it('renders and fires the close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(<ReactionPicker onSelect={vi.fn()} onClose={onClose} />);

    // The close control is the only button without an emoji label (the X icon).
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[0];
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits the close button when onClose is not provided', () => {
    render(<ReactionPicker onSelect={vi.fn()} />);

    // 24 emoji buttons (8 per section x 3), no close button.
    expect(screen.getAllByRole('button')).toHaveLength(24);
  });
});
