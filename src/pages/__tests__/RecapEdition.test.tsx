import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseRecapEditionBySlug } = vi.hoisted(() => ({
  mockUseRecapEditionBySlug: vi.fn(),
}));

vi.mock('@/hooks/useRecapEditions', () => ({
  useRecapEditionBySlug: (...args: unknown[]) => mockUseRecapEditionBySlug(...args),
}));

vi.mock('@/components/seo/SeoHead', () => ({ default: () => null }));
vi.mock('../NotFound', () => ({ default: () => <div>Page Not Found</div> }));

import RecapEdition from '../RecapEdition';

const facts = {
  factsSchemaVersion: 1 as const,
  seasonId: 's-1',
  seasonName: 'Fall 2026',
  seasonSlug: 'fall-2026',
  weekNumber: 6,
  weekStartIso: '2026-10-09T04:00:00.000Z',
  weekEndIso: '2026-10-16T04:00:00.000Z',
  upsets: [],
  hotStreaks: [],
  movers: { basis: 'compared' as const, currentWeek: 6, previousWeek: 5, risers: [], faller: null },
  teamOfTheWeek: null,
  divisions: [
    {
      divisionId: 'd-1',
      divisionName: 'Competitive',
      standings: [
        {
          rank: 1,
          teamId: 't-1',
          teamName: 'Corn Stars',
          logoUrl: null,
          wins: 7,
          losses: 1,
          gameWins: 15,
          gameLosses: 4,
          powerScore: 88.2,
          delta: 1.1,
        },
      ],
    },
  ],
  unresolvedMatchCount: 0,
  generatedAt: '2026-10-16T12:00:00.000Z',
};

const edition = (overrides: Record<string, unknown> = {}) => ({
  id: 'e-1',
  status: 'published',
  first_published_at: '2026-10-16T12:00:00.000Z',
  published_at: '2026-10-16T12:00:00.000Z',
  ...overrides,
});

const version = (overrides: Record<string, unknown> = {}) => ({
  id: 'v-1',
  headline: 'Corn Stars stay top',
  caption: 'Week 6 is in the books.',
  graphic_url: null,
  ...overrides,
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/recap/:seasonSlug/:week" element={<RecapEdition />} />
      </Routes>
    </MemoryRouter>
  );

describe('RecapEdition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRecapEditionBySlug.mockReturnValue({
      data: { facts, edition: edition(), version: version() },
      isLoading: false,
      isError: false,
    });
  });

  it('renders the edition at its public address', () => {
    renderAt('/recap/fall-2026/week-6');

    expect(screen.getByText('Week 6')).toBeInTheDocument();
    expect(screen.getByText('Corn Stars stay top')).toBeInTheDocument();
    expect(screen.getByText('Week 6 is in the books.')).toBeInTheDocument();
  });

  // The route has to take a whole segment, so the page owns the `week-N` shape.
  it('rejects a malformed week segment', () => {
    renderAt('/recap/fall-2026/banana');

    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('rejects a week number outside a real season', () => {
    renderAt('/recap/fall-2026/week-99');

    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('passes the parsed week number to the query, not the raw segment', () => {
    renderAt('/recap/fall-2026/week-6');

    expect(mockUseRecapEditionBySlug).toHaveBeenCalledWith('fall-2026', 6);
  });

  it('renders standings from the frozen facts', () => {
    renderAt('/recap/fall-2026/week-6');

    expect(screen.getByText('Competitive')).toBeInTheDocument();
    expect(screen.getByText('Corn Stars')).toBeInTheDocument();
    expect(screen.getByText('7–1')).toBeInTheDocument();
    expect(screen.getByText('88.2')).toBeInTheDocument();
  });

  it('shows only the original date when nothing was corrected', () => {
    renderAt('/recap/fall-2026/week-6');

    expect(screen.getByText(/Published October 16, 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/Corrected/)).not.toBeInTheDocument();
  });

  it('shows both dates once a correction has been published', () => {
    mockUseRecapEditionBySlug.mockReturnValue({
      data: {
        facts,
        edition: edition({ published_at: '2026-10-20T12:00:00.000Z' }),
        version: version(),
      },
      isLoading: false,
      isError: false,
    });

    renderAt('/recap/fall-2026/week-6');

    expect(screen.getByText(/Published October 16, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Corrected October 20, 2026/)).toBeInTheDocument();
  });

  it('shows Not Found when nothing is published at that address', () => {
    mockUseRecapEditionBySlug.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    renderAt('/recap/fall-2026/week-6');

    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });
});
