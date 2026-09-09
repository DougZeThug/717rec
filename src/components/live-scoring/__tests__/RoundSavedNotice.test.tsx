import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoundSavedNotice } from '../RoundSavedNotice';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RoundSavedNotice', () => {
  it('says nothing until a round is saved', () => {
    render(<RoundSavedNotice saved={null} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('confirms the round that was saved, then gets out of the way', () => {
    const { rerender } = render(<RoundSavedNotice saved={null} />);

    rerender(<RoundSavedNotice saved={{ round: 4, at: 1 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Round 4 saved');

    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('comes back for the next round', () => {
    const { rerender } = render(<RoundSavedNotice saved={{ round: 4, at: 1 }} />);
    act(() => vi.advanceTimersByTime(3000));

    rerender(<RoundSavedNotice saved={{ round: 5, at: 2 }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Round 5 saved');
  });
});
