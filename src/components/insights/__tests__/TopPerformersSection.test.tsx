import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TopPerformer } from '@/hooks/useLeagueInsights';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

import TopPerformersSection from '../TopPerformersSection';

const makePerformer = (overrides: Partial<TopPerformer> = {}): TopPerformer => ({
  category: 'Top Power Score',
  teamName: 'Thunder Chuckers',
  teamId: 't1',
  logoUrl: null,
  value: '92.3',
  description: '10-2 record',
  ...overrides,
});

describe('TopPerformersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there are no performers', () => {
    const { container } = render(<TopPerformersSection performers={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('Top Performers')).not.toBeInTheDocument();
  });

  it('renders the heading, category label, team name and value for each performer', () => {
    render(
      <TopPerformersSection
        performers={[
          makePerformer(),
          makePerformer({
            category: 'Best Win Rate',
            teamName: 'Bag Slingers',
            teamId: 't2',
            value: '83%',
            description: '10-2 record',
          }),
        ]}
      />
    );

    expect(screen.getByText('Top Performers')).toBeInTheDocument();
    expect(screen.getByText('Top Power Score')).toBeInTheDocument();
    expect(screen.getByText('Thunder Chuckers')).toBeInTheDocument();
    expect(screen.getByText('92.3')).toBeInTheDocument();
    expect(screen.getByText('Best Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Bag Slingers')).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it("navigates to the performer's team page when the card is clicked", async () => {
    const user = userEvent.setup();
    render(<TopPerformersSection performers={[makePerformer({ teamId: 't1' })]} />);

    await user.click(screen.getByRole('button', { name: /Thunder Chuckers/i }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/teams/t1');
  });
});
