import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));

describe('ResponsiveDialogContent on desktop', () => {
  it('caps its height and scrolls so a tall dialog stays reachable', () => {
    render(
      <ResponsiveDialog open onOpenChange={vi.fn()}>
        <ResponsiveDialogContent>
          <ResponsiveDialogTitle>Long report</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Tall content</ResponsiveDialogDescription>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );

    const panel = screen.getByRole('dialog');
    expect(panel).toHaveClass('overflow-y-auto');
    expect(panel).toHaveClass('max-h-[90vh]');
  });
});
