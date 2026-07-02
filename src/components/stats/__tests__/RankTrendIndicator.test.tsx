import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ children, ...props }, ref) => {
        const { className } = props;
        return (
          <div ref={ref} className={className}>
            {children}
          </div>
        );
      }
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/utils/logger', () => ({ debugLog: vi.fn() }));

import RankTrendIndicator from '../RankTrendIndicator';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RankTrendIndicator', () => {
  it('shows a dash when rankChange is undefined', () => {
    render(<RankTrendIndicator />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows "0" when the rank did not change', () => {
    render(<RankTrendIndicator rankChange={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('+0')).not.toBeInTheDocument();
  });

  it('shows a green upward trend with +N when the team moved up', () => {
    const { container } = render(<RankTrendIndicator rankChange={3} />);
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
    expect(container.querySelector('.text-red-600')).not.toBeInTheDocument();
  });

  it('shows a red downward trend with the negative value when the team moved down', () => {
    const { container } = render(<RankTrendIndicator rankChange={-2} />);
    expect(screen.getByText('-2')).toBeInTheDocument();
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();
    expect(container.querySelector('.text-green-600')).not.toBeInTheDocument();
  });
});
