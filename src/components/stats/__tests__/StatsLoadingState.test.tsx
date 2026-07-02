import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// StaggeredContent / AutoStagger animate via framer-motion; replace with plain
// containers so the skeleton structure renders synchronously in jsdom.
vi.mock('@/components/ui/staggered-content', () => ({
  StaggeredContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StaggerItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AutoStagger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/shimmer-skeleton', () => ({
  ShimmerSkeleton: ({ className }: { className?: string }) => (
    <div data-testid="shimmer-skeleton" className={className} />
  ),
  CardSkeleton: () => <div data-testid="card-skeleton" />,
}));

import StatsLoadingState from '../StatsLoadingState';

describe('StatsLoadingState', () => {
  it('renders the header shimmer skeleton', () => {
    const { getByTestId } = render(<StatsLoadingState />);
    expect(getByTestId('shimmer-skeleton')).toBeInTheDocument();
  });

  it('renders six card skeleton placeholders', () => {
    const { getAllByTestId } = render(<StatsLoadingState />);
    expect(getAllByTestId('card-skeleton')).toHaveLength(6);
  });
});
