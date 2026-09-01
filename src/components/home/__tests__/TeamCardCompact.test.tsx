import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { Team } from '@/types';

import TeamCardCompact from '../TeamCardCompact';

const team = { id: 't1', name: 'Degeneration X' } as Team;

const renderBadge = (isWinter: boolean) => {
  render(
    <MemoryRouter>
      <TeamCardCompact team={team} rank={1} isWinter={isWinter} />
    </MemoryRouter>
  );
  return screen.getByText('#1');
};

// The rank badge is white text at 12px bold, so WCAG AA wants 4.5:1. Measured
// against white: blue-600 5.17, blue-500 3.68, cyan-700 5.36, cyan-500 2.43.
// Both failing colours were live until e2e/a11y.spec.ts caught them — and it
// only catches them on the runs where it happens to scan a team card, so these
// two assertions are the deterministic guard.
describe('TeamCardCompact rank badge contrast', () => {
  it('uses blue-600 in both themes, never the blue-500 that fails AA', () => {
    const badge = renderBadge(false);

    expect(badge).toHaveClass('bg-blue-600');
    // 3.68:1 — was applied in dark mode only, which is where it failed.
    expect(badge.className).not.toContain('bg-blue-500');
  });

  it('uses cyan-700 in the winter theme, never the cyan-500 that fails AA', () => {
    const badge = renderBadge(true);

    expect(badge).toHaveClass('bg-cyan-700');
    // 2.43:1 — the worst of the two, and it applied in both light and dark.
    expect(badge.className).not.toContain('bg-cyan-500');
  });
});
