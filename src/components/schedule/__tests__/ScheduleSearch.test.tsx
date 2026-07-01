import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ScheduleSearch from '../ScheduleSearch';

describe('ScheduleSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the controlled input with the provided value and placeholder', () => {
    render(<ScheduleSearch value="cornhole night" onChange={vi.fn()} />);

    const input = screen.getByRole('textbox', { name: 'Search matches' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('cornhole night');
    expect(input).toHaveAttribute('placeholder', 'Search matches');
  });

  it('calls onChange with the updated string value when the user types', async () => {
    const onChange = vi.fn();
    render(<ScheduleSearch value="" onChange={onChange} />);

    const input = screen.getByLabelText('Search matches');
    await userEvent.type(input, 'a');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('a');
  });
});
