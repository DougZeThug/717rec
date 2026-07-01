import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NotFound from '../NotFound';

const mockNavigate = vi.fn();
const mockRouteLog = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/utils/logger', () => ({
  routeLog: (...args: unknown[]) => mockRouteLog(...args),
}));

// Render EmptyState's actions as real buttons so we can exercise the wiring
// (icons/animations are irrelevant to the page's behavior).
vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({
    title,
    description,
    actions = [],
  }: {
    title: string;
    description: string;
    actions?: { label: string; onClick: () => void }[];
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions.map((action) => (
        <button key={action.label} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

const renderPage = (initialEntry = '/does-not-exist') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NotFound />
    </MemoryRouter>
  );

describe('NotFound page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the not-found message', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Page Not Found' })).toBeInTheDocument();
    expect(
      screen.getByText(/The page you're looking for doesn't exist or has been moved/i)
    ).toBeInTheDocument();
  });

  it('logs the attempted route on mount', () => {
    renderPage('/totally/missing');

    expect(mockRouteLog).toHaveBeenCalledWith(
      '404 Error: User attempted to access non-existent route:',
      '/totally/missing'
    );
  });

  it('navigates home when "Go Home" is clicked', () => {
    renderPage();

    screen.getByRole('button', { name: 'Go Home' }).click();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates back when "Go Back" is clicked', () => {
    renderPage();

    screen.getByRole('button', { name: 'Go Back' }).click();
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
