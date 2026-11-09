import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../alert-dialog';
import { Command, CommandDialog, CommandInput, CommandList } from '../command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../dialog';

// jsdom does no layout, so these pin the classes. Measured in a real browser at
// 320, 390 and 1280 pixels (Wave 1 of the phone polish, fake data only).
beforeAll(() => {
  // cmdk needs ResizeObserver, which jsdom does not have.
  globalThis.ResizeObserver =
    globalThis.ResizeObserver ||
    (class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as unknown as typeof ResizeObserver);
});

const renderDialog = (className?: string) =>
  render(
    <Dialog open>
      <DialogContent className={className}>
        <DialogTitle>Edit round</DialogTitle>
        <DialogDescription>Fix a wrong score</DialogDescription>
      </DialogContent>
    </Dialog>
  );

describe('a centred pop-up on a phone', () => {
  it('keeps a 16px gap each side, stays inside the screen height and scrolls inside', () => {
    renderDialog();

    const panel = screen.getByRole('dialog');
    // 100% - 2rem: a 16px gap on each side. max-w-lg still sets the desktop width.
    expect(panel).toHaveClass('w-[calc(100%-2rem)]', 'max-w-lg');
    expect(panel).not.toHaveClass('w-full');
    expect(panel).toHaveClass('max-h-[calc(100dvh-2rem)]', 'overflow-y-auto');
    // Round corners at every size, now that the box no longer touches the screen edges.
    expect(panel).toHaveClass('rounded-card');
    expect(panel).not.toHaveClass('sm:rounded-card');
  });

  it("lets a caller's own height limit replace the shared one", () => {
    renderDialog('max-h-[90vh]');

    const panel = screen.getByRole('dialog');
    expect(panel).toHaveClass('max-h-[90vh]');
    // Two max-heights would leave the smaller one in charge. tailwind-merge drops
    // the shared cap because it has no supports-[...] variant.
    expect(panel).not.toHaveClass('max-h-[calc(100dvh-2rem)]');
  });

  it('keeps the search palette clipped, not scrolling: its list scrolls by itself', () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Search teams, pages, or actions..." />
        <CommandList />
      </CommandDialog>
    );

    const panel = screen.getByRole('dialog');
    expect(panel).toHaveClass('overflow-hidden');
    expect(panel).not.toHaveClass('overflow-y-auto');
  });

  it('gives a confirmation the same 16px gap and round corners', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Leave team?</AlertDialogTitle>
          <AlertDialogDescription>You can ask to join again.</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>
    );

    const panel = screen.getByRole('alertdialog');
    expect(panel).toHaveClass('w-[calc(100%-2rem)]', 'rounded-lg');
    expect(panel).not.toHaveClass('w-full');
    expect(panel).not.toHaveClass('sm:rounded-lg');
  });
});

describe('the search box in a team picker', () => {
  it('is 16px on a phone so iPhone Safari does not zoom in, and 14px from 768px up', () => {
    render(
      <Command>
        <CommandInput placeholder="Search teams..." />
      </Command>
    );

    const input = screen.getByPlaceholderText('Search teams...');
    expect(input).toHaveClass('text-base', 'md:text-sm');
    expect(input).not.toHaveClass('text-sm');
    // The 44px box stays: 16px text fits inside h-11 with py-3 (checked in a browser).
    expect(input).toHaveClass('h-11', 'py-3');
  });
});
