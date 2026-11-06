import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { HeroCardFormData } from '@/types/heroCard';

import { EventWinnersEditor } from '../EventWinnersEditor';

const formData = {
  card_type: 'event',
  metadata: JSON.stringify({
    past_winners: [{ week: 3, winners: [{ place: 1, names: 'Corn Stars' }] }],
  }),
} as unknown as HeroCardFormData;

describe('EventWinnersEditor', () => {
  it('writes the metadata back without the week when the admin removes it', async () => {
    const onChange = vi.fn();
    render(<EventWinnersEditor formData={formData} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove week 3' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(JSON.parse(onChange.mock.calls[0][1]).past_winners).toEqual([]);
  });

  // jsdom does no layout, so this pins the classes. The remove buttons were 32px wide and the
  // week and winner fields 32px tall; every other button and field in this app is 44px.
  it('keeps the remove buttons 44px wide and the fields at the standard 44px height', () => {
    render(<EventWinnersEditor formData={formData} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Remove week 3' })).toHaveClass('min-w-11');
    expect(screen.getByRole('button', { name: 'Remove winner' })).toHaveClass('min-w-11');
    for (const field of [screen.getByDisplayValue('3'), screen.getByDisplayValue('Corn Stars')]) {
      expect(field).not.toHaveClass('h-8');
      expect(field).toHaveClass('h-11');
    }
  });
});
