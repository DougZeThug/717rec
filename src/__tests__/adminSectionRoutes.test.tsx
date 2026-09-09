import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

/**
 * `/timeslots` and `/admin/notifications` were once pages of their own,
 * duplicating sections inside the console. Both are still in the wild as
 * bookmarks. `/timeslots` redirects; `/admin/notifications` needs no redirect at
 * all now, because it is the real address of the Notifications section.
 *
 * The route table itself is asserted here rather than in `App.tsx`, which drags
 * in every provider. `admin-gating.test.tsx` covers the guard around it.
 */
const AdminSection = () => {
  const { pathname } = useLocation();
  return <div data-testid="section">{pathname}</div>;
};

const renderRoutes = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/timeslots" element={<Navigate to="/admin/timeslots" replace />} />
        <Route path="/admin/:section" element={<AdminSection />} />
        <Route path="*" element={<div data-testid="section">not found</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('legacy admin addresses', () => {
  it('sends /timeslots to the Timeslots section', async () => {
    renderRoutes('/timeslots');

    await waitFor(() =>
      expect(screen.getByTestId('section')).toHaveTextContent('/admin/timeslots')
    );
  });

  it('serves /admin/notifications as the Notifications section', () => {
    renderRoutes('/admin/notifications');

    expect(screen.getByTestId('section')).toHaveTextContent('/admin/notifications');
  });
});
