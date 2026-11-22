import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlayoffPageData } from '../../hooks/usePlayoffPageData';
import PlayoffPageLayout from '../PlayoffPageLayout';

const mocks = vi.hoisted(() => ({
  realtime: vi.fn(),
  challongeConfig: vi.fn(),
  seasonalTheme: vi.fn(),
  viewSelection: vi.fn(),
}));

vi.mock('@/hooks/brackets/useBracketsManagerRealtime', () => ({
  useBracketsManagerRealtime: mocks.realtime,
}));
vi.mock('@/hooks/useChallongeFallback', () => ({
  useChallongeFallbackConfig: mocks.challongeConfig,
}));
vi.mock('@/hooks/useSeasonalTheme', () => ({ useSeasonalTheme: mocks.seasonalTheme }));
vi.mock('../../hooks/useViewSelection', () => ({ useViewSelection: mocks.viewSelection }));
vi.mock('../../hooks/usePlayoffViewState', () => ({
  usePlayoffViewState: () => ({
    bracketDialogOpen: false,
    setBracketDialogOpen: vi.fn(),
    handleCreateBracket: vi.fn(),
    handleDeleteBracket: vi.fn(),
    teamDialogOpen: false,
    setTeamDialogOpen: vi.fn(),
    deletingBracket: null,
    setDeletingBracket: vi.fn(),
    handleConfirmDeleteBracket: vi.fn(),
    isDeleting: false,
  }),
}));
vi.mock('../PlayoffViewSelector', () => ({
  PlayoffViewSelector: ({ view, data }: { view: string; data: { marker: string } }) => (
    <div data-testid="view-selector">{`${view}:${data.marker}`}</div>
  ),
}));
vi.mock('@/components/playoffs/dialogs/PlayoffDialogs', () => ({
  default: () => <div data-testid="dialogs" />,
}));
vi.mock('@/components/playoffs/embeds/ChallongeFallback', () => ({
  ChallongeFallback: () => <div data-testid="challonge-fallback" />,
}));
vi.mock('@/components/playoffs/indicators/RealtimeIndicator', () => ({
  default: () => <div data-testid="realtime-indicator" />,
}));
vi.mock('@/components/playoffs/PlayoffHeader', () => ({
  default: () => <div data-testid="header" />,
}));
vi.mock('@/components/playoffs/SeasonSelector', () => ({
  default: () => <div data-testid="season-selector" />,
}));

const makeData = (overrides: Record<string, unknown> = {}) =>
  ({
    marker: 'page-data',
    isLoading: false,
    selectedBracketId: null,
    bracket: null,
    selectedSeasonId: 's1',
    setSelectedSeasonId: vi.fn(),
    ...overrides,
  }) as unknown as PlayoffPageData;

const renderLayout = (data: PlayoffPageData) => render(<PlayoffPageLayout data={data} />);

describe('PlayoffPageLayout', () => {
  beforeEach(() => {
    mocks.realtime.mockReturnValue({ realtimeEnabled: false });
    mocks.challongeConfig.mockReturnValue({ data: { enabled: true } });
    mocks.seasonalTheme.mockReturnValue({ shouldApplyWinterBase: false, winterClass: '' });
    mocks.viewSelection.mockReturnValue('public');
  });

  it('gives the view selector the selected view and the page data', () => {
    mocks.viewSelection.mockReturnValue('admin');

    renderLayout(makeData());

    expect(screen.getByTestId('view-selector')).toHaveTextContent('admin:page-data');
    expect(screen.getByTestId('dialogs')).toBeInTheDocument();
  });

  describe('realtime subscription', () => {
    it('passes the selected bracket id and the bracket stage id', () => {
      renderLayout(makeData({ selectedBracketId: 'b1', bracket: { stageId: 42 } }));

      expect(mocks.realtime).toHaveBeenCalledWith('b1', 42);
    });

    it('passes null for the stage when no bracket is loaded', () => {
      renderLayout(makeData({ selectedBracketId: 'b1', bracket: null }));

      expect(mocks.realtime).toHaveBeenCalledWith('b1', null);
    });
  });

  describe('Challonge fallback', () => {
    it('shows when the page is loaded, no bracket is selected and the fallback is enabled', () => {
      renderLayout(makeData());

      expect(screen.getByTestId('challonge-fallback')).toBeInTheDocument();
    });

    it('stays hidden while the page loads', () => {
      renderLayout(makeData({ isLoading: true }));

      expect(screen.queryByTestId('challonge-fallback')).not.toBeInTheDocument();
    });

    it('stays hidden when a bracket is selected', () => {
      renderLayout(makeData({ selectedBracketId: 'b1' }));

      expect(screen.queryByTestId('challonge-fallback')).not.toBeInTheDocument();
    });

    it('stays hidden when the fallback is turned off', () => {
      mocks.challongeConfig.mockReturnValue({ data: { enabled: false } });

      renderLayout(makeData());

      expect(screen.queryByTestId('challonge-fallback')).not.toBeInTheDocument();
    });

    it('stays hidden while the fallback setting has not loaded', () => {
      mocks.challongeConfig.mockReturnValue({ data: undefined });

      renderLayout(makeData());

      expect(screen.queryByTestId('challonge-fallback')).not.toBeInTheDocument();
    });
  });

  describe('winter theme', () => {
    it('applies the winter classes when the seasonal theme asks for them', () => {
      mocks.seasonalTheme.mockReturnValue({
        shouldApplyWinterBase: true,
        winterClass: 'theme-winter-test',
      });

      const { container } = renderLayout(makeData());

      expect(container.firstChild).toHaveClass(
        'page-winter-bg',
        'ice-pattern-bg',
        'theme-winter-test'
      );
      expect(container.firstChild).not.toHaveClass('cornhole-bg');
    });

    it('uses the plain cornhole background otherwise', () => {
      const { container } = renderLayout(makeData());

      expect(container.firstChild).toHaveClass('cornhole-bg');
      expect(container.firstChild).not.toHaveClass('page-winter-bg');
    });
  });
});
