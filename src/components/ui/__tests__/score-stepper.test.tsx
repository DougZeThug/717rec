import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ScoreStepper } from '@/components/ui/score-stepper';

const setup = (props: Partial<React.ComponentProps<typeof ScoreStepper>> = {}) => {
  const onChange = vi.fn();
  render(<ScoreStepper value={5} onChange={onChange} {...props} />);
  return { onChange };
};

describe('ScoreStepper', () => {
  it('shows the score and the team label', () => {
    setup({ label: 'Tigers', teamName: 'Tigers', teamLogo: '/tigers.png' });

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Tigers')).toBeInTheDocument();
    expect(screen.getByAltText('Tigers')).toHaveAttribute('src', '/tigers.png');
  });

  it('raises and lowers the score by one', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(screen.getByRole('button', { name: 'Increase score' }));
    expect(onChange).toHaveBeenLastCalledWith(6);

    await user.click(screen.getByRole('button', { name: 'Decrease score' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('stops at the minimum and the maximum', () => {
    setup({ value: 0, min: 0 });
    expect(screen.getByRole('button', { name: 'Decrease score' })).toBeDisabled();
  });

  it('stops at the maximum', () => {
    setup({ value: 21, max: 21 });
    expect(screen.getByRole('button', { name: 'Increase score' })).toBeDisabled();
  });

  it('marks the leader when the winner indicator is on', () => {
    setup({ showWinnerIndicator: true, isWinning: true });
    expect(screen.getByText('Leading')).toBeInTheDocument();
  });

  it('does not change the score while disabled', () => {
    const { onChange } = setup({ disabled: true });
    expect(screen.getByRole('button', { name: 'Increase score' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
