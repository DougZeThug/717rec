import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

describe('SelectContent', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  const renderOpen = () =>
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Pick a season" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Fake Season 2025 Fall (archived) with a very long name</SelectItem>
          <SelectItem value="b">Fake Season 2026</SelectItem>
        </SelectContent>
      </Select>
    );

  it('lists its options when open', () => {
    renderOpen();

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  // jsdom does no layout, so this pins the class. Without it, a long option name made the popup
  // 377px wide on a 320px phone and cut the options off at the screen edge.
  it('is never wider than the space the screen leaves for it', () => {
    renderOpen();

    expect(screen.getByRole('listbox')).toHaveClass(
      'max-w-(--radix-select-content-available-width)'
    );
  });
});
