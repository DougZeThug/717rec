import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

import { useScrollBehavior } from '@/hooks/usePrefersReducedMotion';

/**
 * Scrolls to the match a link named, e.g. Home's "my match" row, which points
 * at `/schedule?date=…#match-<id>`.
 *
 * Runs once, after the cards exist: a refetch must not drag the reader back up
 * the page. When the card is not on screen — the match may be on the tab that
 * is not open, or on another night — it does nothing. Forcing a tab change to
 * find it would fight the page's own choice of tab, and the link has already
 * opened the right night.
 *
 * It looks again when the open tab changes. The page picks its tab after the
 * matches load, and the inactive tab's cards are not in the page, so the card
 * may only appear on that swap.
 */
export const useScrollToLinkedMatch = (matchesLoading: boolean, activeTab: string): void => {
  const arrivalHash = useLocation().hash;
  const scrollBehavior = useScrollBehavior();
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (hasScrolled.current || matchesLoading) return;
    if (!arrivalHash.startsWith('#match-')) return;

    const card = document.getElementById(`match-${arrivalHash.slice('#match-'.length)}`);
    if (!card) return;

    hasScrolled.current = true;
    card.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
  }, [arrivalHash, matchesLoading, scrollBehavior, activeTab]);
};
