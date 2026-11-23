import { render, screen } from '@testing-library/react';
import React, { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ADMIN_SECTIONS } from '../adminSections';

// Each stub stands in for a heavy section, so the lazy import in adminSections
// loads the right module without pulling in the whole screen.
vi.mock('@/components/admin/batch-matches/BatchMatchCreationTab', () => ({
  default: () => <div>stub batch-matches</div>,
}));
vi.mock('@/components/admin/weekly-content/WeeklyContentPackTab', () => ({
  default: () => <div>stub weekly-content</div>,
}));
vi.mock('@/components/admin/participation/SeasonParticipationTab', () => ({
  default: () => <div>stub participation</div>,
}));
vi.mock('@/components/admin/league-night-status/LeagueNightStatusTab', () => ({
  default: () => <div>stub league-night-status</div>,
}));
vi.mock('@/components/admin/power-migration/PowerMigrationReviewTab', () => ({
  default: () => <div>stub power-migration</div>,
}));
vi.mock('@/components/admin/power-sandbox/PowerScoreSandboxTab', () => ({
  default: () => <div>stub power-sandbox</div>,
}));

const SECTION_IDS = [
  'batch-matches',
  'weekly-content',
  'participation',
  'league-night-status',
  'power-migration',
  'power-sandbox',
];

describe('admin sections load their own screen', () => {
  it.each(SECTION_IDS)('the %s section loads when it is opened', async (id) => {
    const section = ADMIN_SECTIONS.find((item) => item.id === id);
    if (!section) throw new Error(`No admin section with id ${id}`);
    const { Component } = section;

    render(
      <Suspense fallback={<p>loading</p>}>
        <Component />
      </Suspense>
    );

    expect(await screen.findByText(`stub ${id}`)).toBeInTheDocument();
  });
});
