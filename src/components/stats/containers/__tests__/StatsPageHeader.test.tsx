import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockIsMobile = false;
vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/ui/season-badge', () => ({
  default: () => <div data-testid="season-badge" />,
}));

vi.mock('@/components/layout/PageHeader', () => ({
  default: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  ),
}));

import StatsPageHeader from '../StatsPageHeader';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StatsPageHeader', () => {
  beforeEach(() => {
    mockIsMobile = false;
    mockNavigate.mockReset();
  });

  it('shows the Standings title and season badge on desktop', () => {
    render(<StatsPageHeader />);
    expect(screen.getByText('Standings')).toBeInTheDocument();
    expect(screen.getByText('Current season rankings and performance metrics')).toBeInTheDocument();
    expect(screen.getByTestId('season-badge')).toBeInTheDocument();
  });

  it('hides the big page header on mobile', () => {
    mockIsMobile = true;
    render(<StatsPageHeader />);
    expect(screen.queryByTestId('page-header')).not.toBeInTheDocument();
    expect(screen.getByTestId('season-badge')).toBeInTheDocument();
  });

  it('navigates to /insights when the Insights button is clicked (desktop)', async () => {
    render(<StatsPageHeader />);
    await userEvent.click(screen.getByRole('button', { name: /insights/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/insights');
  });

  it('navigates to /insights when the Insights button is clicked (mobile)', async () => {
    mockIsMobile = true;
    render(<StatsPageHeader />);
    await userEvent.click(screen.getByRole('button', { name: /insights/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/insights');
  });

  it('shows exactly one Insights button per layout', () => {
    render(<StatsPageHeader />);
    expect(screen.getAllByRole('button', { name: /insights/i })).toHaveLength(1);
  });
});
