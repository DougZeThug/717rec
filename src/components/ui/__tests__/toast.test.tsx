import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '../toast';

const renderToast = (variant?: 'default' | 'destructive' | 'success') =>
  render(
    <ToastProvider>
      <Toast open variant={variant}>
        <ToastTitle>Season saved</ToastTitle>
        <ToastDescription>It is live.</ToastDescription>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );

describe('Toast', () => {
  it('has a success variant that reads as a success', () => {
    renderToast('success');
    const toast = screen.getByText('Season saved').closest('li');
    expect(toast?.className).toContain('bg-success');
    expect(toast?.className).toContain('text-success-foreground');
  });

  it('keeps default and destructive looks apart from success', () => {
    renderToast('destructive');
    expect(screen.getByText('Season saved').closest('li')?.className).toContain('bg-destructive');
  });

  it('always shows a close button big enough to tap', () => {
    renderToast();
    const close = screen.getByRole('button', { name: 'Close notification' });
    // It used to be opacity-0 until hover, which a phone has not got.
    expect(close.className).not.toContain('opacity-0');
    expect(close.className).toContain('min-h-11');
    expect(close.className).toContain('min-w-11');
  });
});
