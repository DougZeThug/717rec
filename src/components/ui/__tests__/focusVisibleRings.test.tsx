import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { badgeVariants } from '../badge-variants';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../dialog';
import { Select, SelectTrigger, SelectValue } from '../select';
import { Toast, ToastAction, ToastClose, ToastProvider, ToastViewport } from '../toast';

// A button, trigger or badge that shows its focus ring on a mouse click looks
// like a stuck highlight. `focus-visible:` shows the ring for the keyboard only.
// (Text inputs keep `focus:`, because a caret there is a keyboard cue anyway.)
const expectKeyboardOnlyRing = (element: Element | string) => {
  const classes = typeof element === 'string' ? element : (element.getAttribute('class') ?? '');
  expect(classes).toContain('focus-visible:ring-2');
  expect(classes).not.toMatch(/(^|\s)focus:(ring|outline)/);
};

describe('shared controls show their focus ring for the keyboard only', () => {
  it('badge', () => {
    expectKeyboardOnlyRing(badgeVariants());
  });

  it('select trigger', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Pick one">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
      </Select>
    );

    expectKeyboardOnlyRing(screen.getByRole('combobox', { name: 'Pick one' }));
  });

  it('dialog close button', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    expectKeyboardOnlyRing(screen.getByRole('button', { name: 'Close' }));
  });

  it('toast action and close buttons', () => {
    render(
      <ToastProvider>
        <Toast open>
          <ToastAction altText="Undo the change">Undo</ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );

    expectKeyboardOnlyRing(screen.getByRole('button', { name: 'Undo' }));
    expectKeyboardOnlyRing(screen.getByRole('button', { name: 'Close notification' }));
  });
});
