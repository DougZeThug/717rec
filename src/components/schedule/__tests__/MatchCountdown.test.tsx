import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MatchCountdown from '../MatchCountdown';

const NOW = new Date('2026-07-01T12:00:00.000Z');

const isoOffset = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('MatchCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a countdown and progress bar for a future match', () => {
    render(<MatchCountdown matchDate={isoOffset(2 * DAY)} />);

    expect(screen.getByText('2d 0h until match')).toBeInTheDocument();
    expect(screen.getByText(/until match/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('formats hours-and-minutes when the match is less than a day away', () => {
    render(<MatchCountdown matchDate={isoOffset(3 * HOUR)} />);

    expect(screen.getByText('3h 0m until match')).toBeInTheDocument();
  });

  it('renders nothing when the match is in the past', () => {
    const { container } = render(<MatchCountdown matchDate={isoOffset(-2 * DAY)} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/until match/)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('updates the countdown text as time advances via the interval', () => {
    render(<MatchCountdown matchDate={isoOffset(2 * HOUR)} />);

    expect(screen.getByText('2h 0m until match')).toBeInTheDocument();

    // Advance the fake clock by one minute, firing the setInterval callback.
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByText('1h 59m until match')).toBeInTheDocument();
    expect(screen.queryByText('2h 0m until match')).not.toBeInTheDocument();
  });

  it('updates the countdown text when re-rendered with a different future date', () => {
    const { rerender } = render(<MatchCountdown matchDate={isoOffset(2 * DAY)} />);
    expect(screen.getByText('2d 0h until match')).toBeInTheDocument();

    rerender(<MatchCountdown matchDate={isoOffset(3 * HOUR)} />);
    expect(screen.getByText('3h 0m until match')).toBeInTheDocument();
    expect(screen.queryByText('2d 0h until match')).not.toBeInTheDocument();
  });
});
