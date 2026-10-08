import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { FALLBACK_TEAM_IMAGE } from '@/constants/images';
import type { Team } from '@/types';

const fireOnceMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/confetti', () => ({
  fireChampionConfettiOnce: (...args: unknown[]) => fireOnceMock(...args),
}));

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));

import ChampionDisplay from '../ChampionDisplay';

// SeasonalIcon reads the current route, so the banner needs a router around it.
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

const teams = [
  { id: 't-1', name: 'Bag Bandits', divisionName: 'Division A' },
  { id: 't-2', name: 'Corn Stars', divisionName: null },
] as unknown as Team[];

describe('ChampionDisplay', () => {
  it('shows the team logo and swaps in the fallback image when it fails to load', () => {
    const withLogo = [
      { id: 't-3', name: 'Sack Attack', logoUrl: 'https://example.com/logo.png' },
    ] as unknown as Team[];
    render(<ChampionDisplay championId="t-3" teams={withLogo} />);

    const logo = screen.getByAltText('Sack Attack');
    expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
    fireEvent.error(logo);

    expect(logo).toHaveAttribute('src', FALLBACK_TEAM_IMAGE);
    expect(screen.getByText('Division Winner')).toBeInTheDocument();
  });

  it('shows the champion and fires confetti once for that team', async () => {
    render(<ChampionDisplay championId="t-1" teams={teams} />);

    expect(screen.getByText('Bag Bandits')).toBeInTheDocument();
    await waitFor(() => expect(fireOnceMock).toHaveBeenCalledWith('t-1'));
    expect(fireOnceMock).toHaveBeenCalledTimes(1);
  });

  it('renders nothing and fires no confetti without a champion id', () => {
    const { container } = render(<ChampionDisplay teams={teams} />);

    expect(container).toBeEmptyDOMElement();
    expect(fireOnceMock).not.toHaveBeenCalled();
  });

  it('renders nothing and fires no confetti when the champion is not in the team list', () => {
    const { container } = render(<ChampionDisplay championId="missing" teams={teams} />);

    expect(container).toBeEmptyDOMElement();
    expect(fireOnceMock).not.toHaveBeenCalled();
  });
});
