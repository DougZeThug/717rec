import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { LegacyAdminRedirect } from '@/components/admin/LegacyAdminRedirect';
import { ADMIN_TAB_STORAGE_KEY } from '@/utils/adminTabs';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/timeslots" element={<LegacyAdminRedirect section="timeslots" />} />
        <Route
          path="/admin/notifications"
          element={<LegacyAdminRedirect section="notifications" />}
        />
        <Route path="/admin" element={<div data-testid="admin-dashboard">Admin Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('LegacyAdminRedirect', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('sends a legacy address to the admin dashboard', () => {
    renderAt('/timeslots');

    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
  });

  it('chooses the section the old address was a page for', () => {
    renderAt('/timeslots');

    expect(sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY)).toBe('timeslots');
  });

  it('overrides a different section left open from a previous visit', () => {
    // The sidebar restores the last-used section, so without this an old
    // bookmark landed on whichever unrelated tool the admin had open.
    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, 'blind-draw');

    renderAt('/admin/notifications');

    expect(sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY)).toBe('notifications');
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
  });
});
