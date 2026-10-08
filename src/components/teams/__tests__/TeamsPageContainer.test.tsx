import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockIsMobile, mockUsePrefs, setters } = vi.hoisted(() => ({
  mockIsMobile: vi.fn(),
  mockUsePrefs: vi.fn(),
  setters: { setDisplayMode: vi.fn(), setViewMode: vi.fn(), setSortMode: vi.fn() },
}));

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockIsMobile() }));
vi.mock('@/hooks/useScrollRestoration', () => ({ default: vi.fn() }));
vi.mock('@/hooks/useTeamsPreferences', () => ({
  useTeamsPreferences: (options: unknown) => mockUsePrefs(options),
}));
vi.mock('@/components/winter/WinterSection', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../TeamsHeader', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../TeamsContainer', () => ({
  default: (props: { displayMode: string; viewMode: string; sortMode: string }) => (
    <p>{`teams ${props.displayMode} ${props.viewMode} ${props.sortMode}`}</p>
  ),
}));

import TeamsPageContainer from '../TeamsPageContainer';

describe('TeamsPageContainer', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile.mockReturnValue(false);
    mockUsePrefs.mockReturnValue({
      displayMode: 'all',
      viewMode: 'grid',
      sortMode: 'rank',
      ...setters,
    });
  });

  it('starts on All Teams for a wide screen', () => {
    render(<TeamsPageContainer />);

    expect(mockUsePrefs).toHaveBeenCalledWith(
      expect.objectContaining({ defaultDisplayMode: 'all', defaultSortMode: 'rank' })
    );
    expect(screen.getByText('teams all grid rank')).toBeInTheDocument();
  });

  it('starts grouped by division on a phone', () => {
    mockIsMobile.mockReturnValue(true);
    render(<TeamsPageContainer />);

    expect(mockUsePrefs).toHaveBeenCalledWith(
      expect.objectContaining({ defaultDisplayMode: 'grouped' })
    );
  });

  it('lets the desktop toggles change the view and the grouping', () => {
    render(<TeamsPageContainer />);

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(setters.setViewMode).toHaveBeenCalledWith('list');

    fireEvent.click(screen.getByRole('button', { name: 'By Division' }));
    expect(setters.setDisplayMode).toHaveBeenCalledWith('grouped');
  });

  it.each([
    ['Sort', /Sort:\s*Rank/, 'A-Z', 'setSortMode', 'alpha', 'Rank', 'rank'],
    ['View', /View:\s*All/, 'By Division', 'setDisplayMode', 'grouped', 'All Teams', 'all'],
    ['Style', /Style:\s*Grid/, 'List', 'setViewMode', 'list', 'Grid', 'grid'],
  ] as const)(
    'lets the phone %s menu pick either option',
    async (_label, trigger, otherOption, setter, otherValue, firstOption, firstValue) => {
      render(<TeamsPageContainer />);

      await userEvent.click(screen.getByRole('button', { name: trigger }));
      await userEvent.click(await screen.findByRole('menuitem', { name: otherOption }));
      expect(setters[setter]).toHaveBeenLastCalledWith(otherValue);

      await userEvent.click(screen.getByRole('button', { name: trigger }));
      await userEvent.click(await screen.findByRole('menuitem', { name: firstOption }));
      expect(setters[setter]).toHaveBeenLastCalledWith(firstValue);
    }
  );
});
