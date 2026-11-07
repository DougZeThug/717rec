import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from '../checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../dialog';
import { Switch } from '../switch';
import { Tabs, TabsList, TabsTrigger } from '../tabs';

// jsdom does no layout, so these pin the classes. Each control is smaller than 44px to the eye, and
// gets an invisible 44px tap area so it looks the same and is easy to hit.
describe('tap areas of small controls', () => {
  it('makes a tab trigger 44px tall like a Button', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">First</TabsTrigger>
          <TabsTrigger value="b">Second</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    // An invisible area was not enough for tabs: tab rows that wrap touch each other.
    const tab = screen.getByRole('tab', { name: 'First' });
    expect(tab).toHaveClass('min-h-[44px]');
    expect(tab).not.toHaveClass('min-h-[42px]');
  });

  it('gives a switch a 44px tap area without changing its 24px look', () => {
    render(<Switch aria-label="Double header" />);

    expect(screen.getByRole('switch', { name: 'Double header' })).toHaveClass(
      'hit-area-44',
      'h-6',
      'w-11'
    );
  });

  it('gives a checkbox a 44px tap area without changing its 16px look', () => {
    render(<Checkbox aria-label="Keep playoffs active" />);

    expect(screen.getByRole('checkbox', { name: 'Keep playoffs active' })).toHaveClass(
      'hit-area-44',
      'size-4'
    );
  });

  it('puts a 44px invisible tap area around the 16px dialog close X', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Edit</DialogTitle>
          <DialogDescription>Change the thing</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const close = screen.getByRole('button', { name: 'Close' });
    // `absolute` still wins over hit-area-44's `position: relative`, so the X stays in the corner.
    expect(close).toHaveClass('hit-area-44', 'absolute');
  });
});
