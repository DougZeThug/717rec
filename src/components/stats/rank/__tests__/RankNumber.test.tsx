import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../AnimatedRankNumber', () => ({
  AnimatedRankNumber: ({
    rank,
    previousRank,
    showFlash,
  }: {
    rank: number;
    previousRank?: number;
    showFlash?: boolean;
  }) => (
    <div
      data-testid="animated-rank"
      data-rank={rank}
      data-previous-rank={previousRank ?? ''}
      data-show-flash={String(showFlash)}
    />
  ),
}));

import { RankNumber } from '../RankNumber';

describe('RankNumber', () => {
  it('converts the 0-based index to a 1-based rank', () => {
    render(<RankNumber index={0} />);
    expect(screen.getByTestId('animated-rank')).toHaveAttribute('data-rank', '1');
  });

  it('converts the previous rank index to 1-based as well', () => {
    render(<RankNumber index={4} previousRank={2} />);
    const el = screen.getByTestId('animated-rank');
    expect(el).toHaveAttribute('data-rank', '5');
    expect(el).toHaveAttribute('data-previous-rank', '3');
  });

  it('leaves previousRank undefined when not provided', () => {
    render(<RankNumber index={1} />);
    expect(screen.getByTestId('animated-rank')).toHaveAttribute('data-previous-rank', '');
  });

  it('always enables the flash animation', () => {
    render(<RankNumber index={1} />);
    expect(screen.getByTestId('animated-rank')).toHaveAttribute('data-show-flash', 'true');
  });
});
