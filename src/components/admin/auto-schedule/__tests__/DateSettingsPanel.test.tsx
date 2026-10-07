import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import DateSettingsPanel from '../DateSettingsPanel';

type PanelProps = React.ComponentProps<typeof DateSettingsPanel>;

const buildProps = (overrides: Partial<PanelProps> = {}): PanelProps => ({
  selectedDate: new Date(2026, 5, 10),
  setSelectedDate: vi.fn(),
  avoidRematches: true,
  setAvoidRematches: vi.fn(),
  prioritizeQuality: false,
  setPrioritizeQuality: vi.fn(),
  dualMatchMode: false,
  setDualMatchMode: vi.fn(),
  isLoading: false,
  isGenerating: false,
  totalTeams: 0,
  oddBlocks: 0,
  formattedDate: 'June 10, 2026',
  onLoadTeams: vi.fn().mockResolvedValue(undefined),
  onGenerateSchedule: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('DateSettingsPanel', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
    // The calendar opens on the current month, so pin "today" to June 2026.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 10, 12));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('shows the picked date on the date button and the "Select a date" hint when empty', () => {
    const { rerender } = render(<DateSettingsPanel {...buildProps()} />);
    expect(screen.getByRole('button', { name: /June 10th, 2026/ })).toBeInTheDocument();

    rerender(<DateSettingsPanel {...buildProps({ selectedDate: null })} />);
    expect(screen.getByRole('button', { name: /Select a date/ })).toBeInTheDocument();
  });

  it('passes the chosen day from the calendar to setSelectedDate', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<DateSettingsPanel {...props} />);

    await user.click(screen.getByRole('button', { name: /June 10th, 2026/ }));
    await user.click(await screen.findByRole('button', { name: /June 17th, 2026/ }));

    expect(props.setSelectedDate).toHaveBeenCalledTimes(1);
    const picked = (props.setSelectedDate as ReturnType<typeof vi.fn>).mock.calls[0][0] as Date;
    expect(picked.getFullYear()).toBe(2026);
    expect(picked.getMonth()).toBe(5);
    expect(picked.getDate()).toBe(17);
  });

  it('clears the date when the selected day is clicked again', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<DateSettingsPanel {...props} />);

    await user.click(screen.getByRole('button', { name: /June 10th, 2026/ }));
    const days = await screen.findAllByRole('button', { name: /June 10th, 2026/ });
    await user.click(days[days.length - 1]);

    expect(props.setSelectedDate).toHaveBeenCalledWith(null);
  });

  it('toggles the match-rule switches and shows Prioritize Match Quality only outside dual mode', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    const { rerender } = render(<DateSettingsPanel {...props} />);

    await user.click(screen.getByRole('switch', { name: 'Avoid Rematches' }));
    expect(props.setAvoidRematches).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('switch', { name: 'Prioritize Match Quality' }));
    expect(props.setPrioritizeQuality).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('switch', { name: 'Dual Match Mode' }));
    expect(props.setDualMatchMode).toHaveBeenCalledWith(true);
    expect(screen.queryByText(/Teams will play 2 matches/)).not.toBeInTheDocument();

    rerender(<DateSettingsPanel {...buildProps({ dualMatchMode: true })} />);
    expect(
      screen.queryByRole('switch', { name: 'Prioritize Match Quality' })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Teams will play 2 matches/)).toBeInTheDocument();
  });

  it('runs Load Teams and Generate Schedule when teams are loaded', async () => {
    const user = userEvent.setup();
    const props = buildProps({ totalTeams: 8 });
    render(<DateSettingsPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'Load Teams' }));
    await user.click(screen.getByRole('button', { name: /Generate Schedule/ }));

    expect(props.onLoadTeams).toHaveBeenCalledTimes(1);
    expect(props.onGenerateSchedule).toHaveBeenCalledTimes(1);
  });

  it('disables both actions with no date and Generate with no teams', () => {
    const { rerender } = render(
      <DateSettingsPanel {...buildProps({ selectedDate: null, totalTeams: 8 })} />
    );
    expect(screen.getByRole('button', { name: 'Load Teams' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Generate Schedule/ })).toBeDisabled();

    rerender(<DateSettingsPanel {...buildProps({ totalTeams: 0 })} />);
    expect(screen.getByRole('button', { name: 'Load Teams' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Generate Schedule/ })).toBeDisabled();
  });

  it('shows busy labels while loading and generating', () => {
    render(
      <DateSettingsPanel {...buildProps({ isLoading: true, isGenerating: true, totalTeams: 8 })} />
    );
    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled();
  });

  it('shows the status summary with a plural odd-block warning', () => {
    render(<DateSettingsPanel {...buildProps({ totalTeams: 9, oddBlocks: 2 })} />);
    expect(screen.getByText('June 10, 2026')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('(2 blocks with odd number of teams)')).toBeInTheDocument();
  });

  it('uses the singular for one odd block and hides the warning at zero', () => {
    const { rerender } = render(
      <DateSettingsPanel {...buildProps({ totalTeams: 9, oddBlocks: 1 })} />
    );
    expect(screen.getByText('(1 block with odd number of teams)')).toBeInTheDocument();

    rerender(<DateSettingsPanel {...buildProps({ totalTeams: 8, oddBlocks: 0 })} />);
    expect(screen.queryByText(/odd number of teams/)).not.toBeInTheDocument();
  });
});
