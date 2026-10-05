import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SeasonSelector from '../SeasonSelector';

const { mockUseSeasons } = vi.hoisted(() => ({ mockUseSeasons: vi.fn() }));

vi.mock('@/hooks/useSeasons', () => ({ useSeasons: () => mockUseSeasons() }));

const seasons = [
  { id: 's1', name: 'Fall 2026', is_active: true },
  { id: 's2', name: 'Spring 2026', is_active: false },
];

describe('SeasonSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing while seasons load', () => {
    mockUseSeasons.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(
      <SeasonSelector selectedSeasonId={null} onSeasonChange={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is only one season to pick', () => {
    mockUseSeasons.mockReturnValue({ data: [seasons[0]], isLoading: false });
    const { container } = render(<SeasonSelector selectedSeasonId="s1" onSeasonChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('labels the picker with the season it shows', () => {
    mockUseSeasons.mockReturnValue({ data: seasons, isLoading: false });
    render(<SeasonSelector selectedSeasonId="s1" onSeasonChange={vi.fn()} />);

    expect(screen.getByLabelText('Season:')).toBeInTheDocument();
  });

  // The Playoffs page mounts the selector twice. Each copy needs its own id, or
  // the label of one points at the other.
  it('gives each mounted copy its own id so every label points at its own picker', () => {
    mockUseSeasons.mockReturnValue({ data: seasons, isLoading: false });
    render(
      <>
        <SeasonSelector selectedSeasonId="s1" onSeasonChange={vi.fn()} />
        <SeasonSelector selectedSeasonId="s1" onSeasonChange={vi.fn()} />
      </>
    );

    const [first, second] = screen.getAllByLabelText('Season:');
    expect(first.id).not.toBe(second.id);
  });
});
