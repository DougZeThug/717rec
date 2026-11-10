import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { RecapEditionWithVersion } from '@/services/recapEditions/RecapEditionService';

import PublishedRecapCard from '../PublishedRecapCard';

const edition = {
  edition: { id: 'e-1', status: 'published' },
  version: { id: 'v-1', headline: 'Corn Stars stay top', caption: 'Week 6 recap.' },
  facts: { seasonSlug: 'fall-2026', weekNumber: 6 },
} as unknown as RecapEditionWithVersion;

describe('PublishedRecapCard link', () => {
  // jsdom does no layout, so this pins the classes. The link was 20px tall,
  // under the 24px minimum for a text link.
  it('is at least 24px tall to tap and keeps its text centred', () => {
    render(
      <MemoryRouter>
        <PublishedRecapCard edition={edition} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'Read the full recap' });
    expect(link).toHaveAttribute('href', '/recap/fall-2026/week-6');
    expect(link).toHaveClass('min-h-6', 'inline-flex', 'items-center');
  });
});
