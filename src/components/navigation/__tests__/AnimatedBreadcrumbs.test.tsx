import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import AnimatedBreadcrumbs from '../AnimatedBreadcrumbs';

vi.mock('framer-motion', () => ({
  m: {
    li: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <li className={className}>{children}</li>
    ),
  },
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AnimatedBreadcrumbs />
    </MemoryRouter>
  );

describe('AnimatedBreadcrumbs', () => {
  it('links Home and shows the current page as plain text', () => {
    renderAt('/history');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  // jsdom does no layout, so this pins the classes. The Home link was 20px tall, under the 24px
  // floor; the negative margin cancels the padding so the trail does not grow.
  it('gives each breadcrumb link a 32px tap area without moving the trail', () => {
    renderAt('/history');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveClass('py-1.5', '-my-1.5');
  });
});
