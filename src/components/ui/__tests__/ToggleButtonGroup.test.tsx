import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToggleButtonGroup } from '../ToggleButtonGroup';

const options = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
];

describe('ToggleButtonGroup', () => {
  // The active pill puts primary-coloured text on a 10% primary tint. The fill
  // colour as text measured 4.49:1 there in light and 3.61:1 in dark, under the
  // 4.5:1 text needs. text-primary-text is the text-only shade for that tint.
  // jsdom draws nothing, so this pins the class.
  it('draws the active pill with the text-only primary shade', () => {
    render(<ToggleButtonGroup options={options} value="grid" onChange={vi.fn()} />);

    const active = screen.getByRole('button', { name: 'Grid' });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(active).toHaveClass('bg-primary/10', 'text-primary-text');
    expect(active).not.toHaveClass('text-primary');
    expect(screen.getByRole('button', { name: 'List' })).not.toHaveClass('text-primary-text');
  });

  it('lets an option bring its own active colours', () => {
    render(
      <ToggleButtonGroup
        options={[{ ...options[0], activeClassName: 'bg-green-100 text-green-700' }, options[1]]}
        value="grid"
        onChange={vi.fn()}
      />
    );

    const active = screen.getByRole('button', { name: 'Grid' });
    expect(active).toHaveClass('text-green-700');
    expect(active).not.toHaveClass('text-primary-text');
  });
});
