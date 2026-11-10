import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

import { useScrollBehavior } from '@/hooks/usePrefersReducedMotion';

/**
 * Scrolls to the match a link named, e.g. Home's "my match" row, which points
 * at `/schedule?date=…#match-<id>`.
 *
 * Runs once, after the cards exist: a refetch must not drag the reader back up
 * the page. It does not pick the tab: useScheduleTabs opens the tab that holds
 * the linked match on its first pick (Upcoming while it has no score), and the
 * link has already opened the right night. When the card is still not on
 * screen — an unknown id, or the reader changed tab or night — it does nothing.
 *
 * It looks again when the open tab changes. The page picks its tab after the
 * matches load, and the inactive tab's cards are not in the page, so the card
 * may only appear on that swap. A tab panel that has just opened draws its
 * cards one commit later (Radix Presence mounts them in a layout effect), so
 * a card that is not there yet gets one more look on the next frame.
 */
export const useScrollToLinkedMatch = (matchesLoading: boolean, activeTab: string): void => {
  const arrivalHash = useLocation().hash;
  const scrollBehavior = useScrollBehavior();
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (hasScrolled.current || matchesLoading) return undefined;
    if (!arrivalHash.startsWith('#match-')) return undefined;

    const scrollToCard = () => {
      const card = document.getElementById(`match-${arrivalHash.slice('#match-'.length)}`);
      if (!card) return false;

      hasScrolled.current = true;
      card.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
      return true;
    };

    if (scrollToCard()) return undefined;
    const frame = requestAnimationFrame(scrollToCard);
    return () => cancelAnimationFrame(frame);
  }, [arrivalHash, matchesLoading, scrollBehavior, activeTab]);
};
