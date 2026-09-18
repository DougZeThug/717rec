import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecapFactsV1, RecapTeamGrade } from '@/types/recapEdition';

const { mockToast, mockPack, mockExportAll, mockCapture, mockBuildLogoResolver } = vi.hoisted(
  () => ({
    mockToast: vi.fn(),
    mockPack: vi.fn(),
    mockExportAll: vi.fn(),
    mockCapture: vi.fn(),
    mockBuildLogoResolver: vi.fn(),
  })
);

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => ({ data: [{ id: 's-1', name: 'Fall 2026', is_active: true }] }),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/hooks/useUnsavedChangesGuard', () => ({ useUnsavedChangesGuard: vi.fn() }));
vi.mock('../useWeeklyContentPack', () => ({ useWeeklyContentPack: () => mockPack() }));
vi.mock('../export/useGraphicExport', () => ({
  useGraphicExport: () => ({ capture: mockCapture, exportAll: mockExportAll, isExporting: false }),
}));
vi.mock('../export/inlineImages', () => ({ buildLogoResolver: mockBuildLogoResolver }));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn() }));

import WeeklyContentPackTab from '../WeeklyContentPackTab';

const facts: RecapFactsV1 = {
  factsSchemaVersion: 2,
  seasonId: 's-1',
  seasonName: 'Fall 2026',
  seasonSlug: 'fall-2026',
  weekNumber: 6,
  weekStartIso: '2026-10-09T04:00:00.000Z',
  weekEndIso: '2026-10-16T04:00:00.000Z',
  upsets: [],
  hotStreaks: [],
  movers: { basis: 'compared', currentWeek: 6, previousWeek: 5, risers: [], faller: null },
  teamOfTheWeek: null,
  divisions: [],
  powerRankings: [],
  unresolvedMatchCount: 0,
  generatedAt: '2026-10-16T12:00:00.000Z',
};

const team: RecapTeamGrade = {
  rank: 1,
  previousRank: 2,
  teamId: 't-1',
  teamName: 'Bag Chasers',
  logoUrl: null,
  division: 'Competitive',
  grade: 'A',
  gpa: 3.8,
  categories: [],
  wins: 6,
  losses: 2,
  powerScore: 72.4,
  delta: 2.1,
};

const pack = (overrides: Record<string, unknown> = {}) => ({
  facts,
  existingEdition: null,
  isCorrection: false,
  publicPath: '/recap/fall-2026/week-6',
  draft: {
    headline: 'A headline',
    caption: 'A caption',
    commissionerNote: '',
    captionSource: 'fallback' as const,
    captionModel: null,
    blurbs: {},
    blurbsSource: 'fallback' as const,
  },
  setField: vi.fn(),
  isDirty: false,
  generateFor: vi.fn().mockResolvedValue(facts),
  isGenerating: false,
  save: vi.fn(),
  isSaving: false,
  publish: vi.fn(),
  isPublishing: false,
  generateCaption: vi.fn().mockResolvedValue('ok'),
  isGeneratingCaption: false,
  setBlurb: vi.fn(),
  generateBlurbs: vi.fn().mockResolvedValue('ok'),
  isGeneratingBlurbs: false,
  rankings: [team],
  unpublish: vi.fn(),
  isUnpublishing: false,
  canPublish: true,
  reset: vi.fn(),
  ...overrides,
});

/** navigator.clipboard is read-only in jsdom, so it has to be redefined. */
const setClipboard = (writeText: () => Promise<void>) => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
};

const renderTab = () =>
  render(
    <MemoryRouter>
      <WeeklyContentPackTab />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockPack.mockReturnValue(pack());
  mockExportAll.mockResolvedValue({ exported: 3, failed: [] });
  mockBuildLogoResolver.mockResolvedValue((url: string | null) => url);
  setClipboard(vi.fn().mockResolvedValue(undefined));
});

describe('WeeklyContentPackTab', () => {
  it('invites the admin to pick a week before anything is generated', () => {
    mockPack.mockReturnValue(pack({ facts: null }));
    renderTab();

    expect(screen.getByText('Choose a week')).toBeInTheDocument();
  });

  it('says how many graphics downloaded', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: /download graphics/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Downloaded 3 graphics' })
      )
    );
  });

  it('names the graphics that failed rather than reporting success', async () => {
    mockExportAll.mockResolvedValue({
      exported: 2,
      failed: ['717rec-fall-2026-week-6-rankings-2'],
    });
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: /download graphics/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '1 graphic failed',
          description: '717rec-fall-2026-week-6-rankings-2',
          variant: 'destructive',
        })
      )
    );
  });

  it('tells the admin when blurbs are not set up, separately from a failure', async () => {
    const user = userEvent.setup();
    mockPack.mockReturnValue(pack({ generateBlurbs: vi.fn().mockResolvedValue('unconfigured') }));
    renderTab();

    await user.click(screen.getByRole('button', { name: /write blurbs for me/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'AI blurbs are not set up' })
      )
    );
    // And it names what to do about it.
    expect(mockToast.mock.calls[0][0].description).toMatch(/ANTHROPIC_API_KEY/);
  });

  it('says the plain lines are still there when writing them fails', async () => {
    const user = userEvent.setup();
    mockPack.mockReturnValue(pack({ generateBlurbs: vi.fn().mockResolvedValue('failed') }));
    renderTab();

    await user.click(screen.getByRole('button', { name: /write blurbs for me/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not write the blurbs' })
      )
    );
  });

  it('says nothing when the blurbs are written successfully', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: /write blurbs for me/i }));

    await waitFor(() => expect(mockPack().generateBlurbs).toBeDefined());
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('copies the caption, and admits when it cannot', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: /copy caption/i }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ title: 'Caption copied' }));

    mockToast.mockClear();
    setClipboard(vi.fn().mockRejectedValue(new Error('denied')));

    await user.click(screen.getByRole('button', { name: /copy caption/i }));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not copy', variant: 'destructive' })
      )
    );
  });

  it('shows the blurb editor only when there are ranked teams', () => {
    const { unmount } = renderTab();
    expect(screen.getByText('Power rankings (1 teams)')).toBeInTheDocument();
    unmount();

    // A week with nothing ranked shows no blurb editor at all, rather than an
    // empty card with a button that would write nothing.
    mockPack.mockReturnValue(pack({ rankings: [] }));
    renderTab();
    expect(screen.queryByRole('button', { name: /write blurbs for me/i })).not.toBeInTheDocument();
  });
});
