import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AlgorithmSettings } from '../AlgorithmSettings';

const buildProps = (overrides: Partial<React.ComponentProps<typeof AlgorithmSettings>> = {}) => ({
  avoidRematches: true,
  setAvoidRematches: vi.fn(),
  prioritizeQuality: false,
  setPrioritizeQuality: vi.fn(),
  ...overrides,
});

const openSettings = () =>
  userEvent.click(screen.getByRole('button', { name: /Algorithm Settings/ }));

describe('AlgorithmSettings', () => {
  it('keeps the options hidden until the section is opened', () => {
    render(<AlgorithmSettings {...buildProps()} />);

    expect(screen.queryByRole('switch', { name: 'Avoid Rematches' })).not.toBeInTheDocument();
  });

  it('shows each option with its explanation and passes toggles through', async () => {
    const props = buildProps();
    render(<AlgorithmSettings {...props} />);
    await openSettings();

    expect(
      screen.getByText("Prioritize pairing teams that haven't played each other before")
    ).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Avoid Rematches' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Prioritize Match Quality' })).not.toBeChecked();

    await userEvent.click(screen.getByRole('switch', { name: 'Avoid Rematches' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Prioritize Match Quality' }));

    expect(props.setAvoidRematches).toHaveBeenCalledWith(false);
    expect(props.setPrioritizeQuality).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('switch', { name: 'Dual Match Mode' })).not.toBeInTheDocument();
  });

  it('offers Dual Match Mode when it can be changed, and hides match quality while it is on', async () => {
    const props = buildProps({ dualMatchMode: true, setDualMatchMode: vi.fn() });
    render(<AlgorithmSettings {...props} />);
    await openSettings();

    const dual = screen.getByRole('switch', { name: 'Dual Match Mode' });
    expect(dual).toBeChecked();
    expect(
      screen.queryByRole('switch', { name: 'Prioritize Match Quality' })
    ).not.toBeInTheDocument();

    await userEvent.click(dual);
    expect(props.setDualMatchMode).toHaveBeenCalledWith(false);
  });
});
