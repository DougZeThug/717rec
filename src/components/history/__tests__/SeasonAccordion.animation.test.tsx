import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SeasonAccordion from '../SeasonAccordion';

// Records the `initial` prop each time the (mocked) AnimatePresence is drawn.
const presenceSpy = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children, initial }: { children: React.ReactNode; initial?: boolean }) => {
    presenceSpy(initial);
    return children;
  },
  m: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));
vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: false }),
}));
vi.mock('@/services/SeasonService', () => ({
  SeasonService: { fetchSeasonStatsForAccordion: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../SeasonAccordionExpandedContent', () => ({
  default: () => <div>expanded content</div>,
}));

const season = {
  id: 's1',
  name: 'Spring',
  start_date: '2025-01-01',
  end_date: '2025-03-01',
  is_active: false,
};

describe('SeasonAccordion opening animation', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('does not play the opening animation for a season that is already open when the page is drawn', () => {
    // A season left open must appear at full height. If it grew from nothing, the scroll
    // position restored on Back would land short, because the page is still short at that time.
    sessionStorage.setItem('history_open_state', JSON.stringify({ 'season:s1': true }));

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <SeasonAccordion season={season} />
      </QueryClientProvider>
    );

    // The saved-open season really is drawn open (the mocked content only exists when it is), so
    // `initial={false}` is the answer for an open season and not just a hard-coded prop.
    expect(screen.getByText('expanded content')).toBeInTheDocument();
    expect(presenceSpy).toHaveBeenCalledWith(false);
  });
});
