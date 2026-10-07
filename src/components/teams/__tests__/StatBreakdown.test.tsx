import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockTheme = vi.hoisted(() => ({ resolvedTheme: 'light' as string | undefined }));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: mockTheme.resolvedTheme }),
}));

import StatBreakdown from '../StatBreakdown';

const baseProps = {
  wins: 8,
  losses: 4,
  winPercentage: '66.7',
  gamesWon: 21,
  gamesLost: 10,
  gameWinPercentage: '66.7',
  strengthOfSchedule: '0.600',
  closeMatchLosses: 2,
  powerScore: 1450,
};

describe('StatBreakdown', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    mockTheme.resolvedTheme = 'light';
  });

  it('opens on the Core tab with record, win percentage and rank', () => {
    render(<StatBreakdown {...baseProps} rank={3} totalTeams={12} rankChange={2} />);

    expect(screen.getByRole('heading', { name: 'Team Stats' })).toBeInTheDocument();
    expect(screen.getByText('Match Record')).toBeInTheDocument();
    // Match record shows wins and losses side by side.
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
    expect(screen.getByText('3/12')).toBeInTheDocument();
  });

  it('leaves the ranking tile out when the team has no rank', () => {
    render(<StatBreakdown {...baseProps} />);

    expect(screen.queryByText('Ranking')).not.toBeInTheDocument();
  });

  it('shows game record, sweeps and clutch results on the Game tab', async () => {
    const user = userEvent.setup();
    render(
      <StatBreakdown
        {...baseProps}
        sweeps={5}
        sweepRate={62.5}
        clutchWins={3}
        clutchWinPct={60}
        clutchGame3s={5}
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Game' }));

    expect(screen.getByText('Game Record')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Close Match Losses')).toBeInTheDocument();
    expect(screen.getByText('62.5%')).toBeInTheDocument();
    expect(screen.getByText('5 of 8 wins')).toBeInTheDocument();
    expect(screen.getByText('3 wins in 5 game-3s')).toBeInTheDocument();
  });

  it('hides sweep and clutch tiles for a team with no wins and no game-3s', async () => {
    const user = userEvent.setup();
    render(<StatBreakdown {...baseProps} wins={0} />);

    await user.click(screen.getByRole('tab', { name: 'Game' }));

    expect(screen.queryByText('Sweep Rate')).not.toBeInTheDocument();
    expect(screen.queryByText('Clutch Win %')).not.toBeInTheDocument();
  });

  it('shows strength of schedule and the detailed grid on the Advanced tab', async () => {
    const user = userEvent.setup();
    render(<StatBreakdown {...baseProps} />);

    await user.click(screen.getByRole('tab', { name: 'Advanced' }));

    expect(screen.getByText('Strength of Schedule')).toBeInTheDocument();
    expect(screen.getByText('0.600')).toBeInTheDocument();
    expect(screen.getByText('Win-Loss Ratio')).toBeInTheDocument();
    expect(screen.getByText('2.00')).toBeInTheDocument();
    expect(screen.getByText('Game Win-Loss Ratio')).toBeInTheDocument();
    expect(screen.getByText('2.10')).toBeInTheDocument();
    expect(screen.getByText('Total Matches')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Total Games')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('avoids dividing by zero in the ratios when a team has no losses', async () => {
    const user = userEvent.setup();
    render(<StatBreakdown {...baseProps} losses={0} gamesLost={0} />);

    await user.click(screen.getByRole('tab', { name: 'Advanced' }));

    expect(screen.getByText('8.00')).toBeInTheDocument();
    expect(screen.getByText('21.00')).toBeInTheDocument();
  });

  it('hides and shows the detailed stats with the toggle', async () => {
    const user = userEvent.setup();
    render(<StatBreakdown {...baseProps} />);

    await user.click(screen.getByRole('tab', { name: 'Advanced' }));
    await user.click(screen.getByRole('button', { name: 'Hide Detailed Stats' }));

    expect(screen.queryByText('Win-Loss Ratio')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show Detailed Stats' }));

    expect(screen.getByText('Win-Loss Ratio')).toBeInTheDocument();
  });

  it.each([
    ['0.900', 'rgb(185, 28, 28)'],
    ['0.800', 'rgb(239, 68, 68)'],
    ['0.600', 'rgb(249, 115, 22)'],
    ['0.300', 'rgb(22, 163, 74)'],
  ])('colours a %s schedule strength in the light theme', async (sos, colour) => {
    const user = userEvent.setup();
    render(<StatBreakdown {...baseProps} strengthOfSchedule={sos} />);

    await user.click(screen.getByRole('tab', { name: 'Advanced' }));

    expect(screen.getByText(sos)).toHaveStyle({ color: colour });
  });

  it('uses a colour class instead of an inline colour in the dark theme', async () => {
    mockTheme.resolvedTheme = 'dark';
    const user = userEvent.setup();
    render(<StatBreakdown {...baseProps} strengthOfSchedule="0.900" />);

    await user.click(screen.getByRole('tab', { name: 'Advanced' }));

    const value = screen.getByText('0.900');
    expect(value.style.color).toBe('');
    expect(value.className).not.toBe('');
  });

  it('collapses the whole card from the header', async () => {
    const user = userEvent.setup();
    render(<StatBreakdown {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /team stats/i }));

    expect(screen.queryByRole('tab', { name: 'Core' })).not.toBeInTheDocument();
  });
});
