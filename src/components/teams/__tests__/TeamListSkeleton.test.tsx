import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TeamListSkeleton } from '../TeamListSkeleton';

vi.mock('@/components/ui/staggered-content', () => ({
  AutoStagger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

describe('TeamListSkeleton', () => {
  it('draws three placeholder cards, each with four stat boxes, in list view', () => {
    const { container } = render(<TeamListSkeleton viewMode="list" />);

    expect(container.querySelectorAll('.h-\\[150px\\]')).toHaveLength(3);
    expect(container.querySelectorAll('.rounded-input.space-y-2')).toHaveLength(12);
  });

  it('draws three placeholder cards as a grid in grid view', () => {
    const { container } = render(<TeamListSkeleton viewMode="grid" />);

    expect(container.querySelector('.grid-cols-1')).toBeInTheDocument();
    expect(container.querySelectorAll('.h-\\[220px\\]')).toHaveLength(3);
    expect(container.querySelectorAll('.rounded-input.space-y-2')).toHaveLength(0);
  });
});
