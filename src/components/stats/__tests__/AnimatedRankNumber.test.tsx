import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, className }, ref) => (
        <div ref={ref} className={className}>
          {children}
        </div>
      )
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

let mockIsWinterTheme = false;
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: mockIsWinterTheme }),
  useSeasonalThemeBase: () => ({ isWinterTheme: mockIsWinterTheme }),
}));

import { AnimatedRankNumber } from '../AnimatedRankNumber';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AnimatedRankNumber', () => {
  it('renders the rank number', () => {
    mockIsWinterTheme = false;
    render(<AnimatedRankNumber rank={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('styles rank 1 as gold', () => {
    mockIsWinterTheme = false;
    render(<AnimatedRankNumber rank={1} />);
    expect(screen.getByText('1').className).toContain('bg-amber-100');
  });

  it('styles rank 2 as silver', () => {
    mockIsWinterTheme = false;
    render(<AnimatedRankNumber rank={2} />);
    expect(screen.getByText('2').className).toContain('bg-slate-100');
  });

  it('styles rank 3 as bronze', () => {
    mockIsWinterTheme = false;
    render(<AnimatedRankNumber rank={3} />);
    expect(screen.getByText('3').className).toContain('bg-orange-100');
  });

  it('uses muted styling for ranks below 3', () => {
    mockIsWinterTheme = false;
    render(<AnimatedRankNumber rank={7} />);
    expect(screen.getByText('7').className).toContain('bg-muted');
  });

  it('uses winter podium styling when the winter theme is active', () => {
    mockIsWinterTheme = true;
    render(<AnimatedRankNumber rank={1} />);
    expect(screen.getByText('1').className).toContain('bg-amber-900/50');
  });

  it('flashes green when the rank improved', () => {
    mockIsWinterTheme = false;
    render(<AnimatedRankNumber rank={2} previousRank={5} showFlash />);
    expect(screen.getByText('2').className).toContain('ring-green-500');
  });

  it('flashes red when the rank got worse', () => {
    mockIsWinterTheme = false;
    render(<AnimatedRankNumber rank={6} previousRank={2} showFlash />);
    expect(screen.getByText('6').className).toContain('ring-red-500');
  });

  it('does not flash when showFlash is false', () => {
    mockIsWinterTheme = false;
    render(<AnimatedRankNumber rank={2} previousRank={5} showFlash={false} />);
    expect(screen.getByText('2').className).not.toContain('ring-green-500');
  });
});
