import { useEffect, useRef, useState } from 'react';

const SCHEDULE_TAB_KEY = 'scheduleActiveTab';

interface UseScheduleTabsOptions {
  selectedDate: Date;
  matchesLoading: boolean;
  timeslotsLoading: boolean;
  upcomingMatches: { id: string }[] | undefined;
  completedMatches?: { id: string }[] | undefined;
  /**
   * The match a shared link names (`#match-<id>`). On the first tab pick only,
   * the page opens the tab that holds it, before the date rule.
   */
  linkedMatchId?: string;
}

interface UseScheduleTabsResult {
  activeTab: string;
  handleTabChange: (tabId: string) => void;
}

/**
 * The tab that holds the linked match: 'upcoming' while it has no score,
 * 'completed' once scored. null with no link or an id the page does not know.
 */
const tabHoldingMatch = (
  linkedMatchId: string | undefined,
  upcomingMatches: { id: string }[] | undefined,
  completedMatches: { id: string }[] | undefined
): 'upcoming' | 'completed' | null => {
  if (!linkedMatchId) return null;
  if (upcomingMatches?.some((match) => match.id === linkedMatchId)) return 'upcoming';
  if (completedMatches?.some((match) => match.id === linkedMatchId)) return 'completed';
  return null;
};

/**
 * Manages the active tab state for the Schedule page.
 *
 * - Persists the selected tab across navigation via sessionStorage.
 * - Automatically picks a sensible default tab whenever the selected date
 *   changes, once match and timeslot data have finished loading.
 * - A link to one match opens the tab that holds it, so last week's unscored
 *   match shows under Upcoming. This is the first pick only: the hash stays in
 *   the address, and a later date change must follow the date rule.
 */
export const useScheduleTabs = ({
  selectedDate,
  matchesLoading,
  timeslotsLoading,
  upcomingMatches,
  completedMatches,
  linkedMatchId,
}: UseScheduleTabsOptions): UseScheduleTabsResult => {
  const [activeTab, setActiveTab] = useState<string>(
    () => sessionStorage.getItem(SCHEDULE_TAB_KEY) || 'timeslots'
  );
  const hasInitializedTab = useRef(false);
  // State, not a ref: the link may pick the tab once, on the first pick only.
  const [linkUsed, setLinkUsed] = useState(false);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    sessionStorage.setItem(SCHEDULE_TAB_KEY, tabId);
  };

  // Reset initialization flag when date changes so smart-default runs again.
  useEffect(() => {
    hasInitializedTab.current = false;
  }, [selectedDate]);

  // Smart default tab logic - only runs once per date selection, after data loads.
  useEffect(() => {
    if (hasInitializedTab.current) return;
    if (matchesLoading || timeslotsLoading) return;

    hasInitializedTab.current = true;

    // A link to one match → the tab that holds it (first pick only).
    const linkedTab = linkUsed
      ? null
      : tabHoldingMatch(linkedMatchId, upcomingMatches, completedMatches);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    // Past dates → show completed matches (a linked match picks its own tab)
    if (linkedTab === 'completed' || (!linkedTab && selected < today)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- navigates tab when selected date changes (intentional)
      handleTabChange('completed');
      setLinkUsed(true);
      return;
    }

    // Today / future, or a linked unscored match: prefer upcoming matches, then timeslots
    if (linkedTab === 'upcoming' || (upcomingMatches && upcomingMatches.length > 0)) {
      handleTabChange('upcoming');
      setLinkUsed(true);
      return;
    }

    handleTabChange('timeslots');
    setLinkUsed(true);
  }, [
    selectedDate,
    matchesLoading,
    timeslotsLoading,
    upcomingMatches,
    completedMatches,
    linkedMatchId,
    linkUsed,
  ]);

  return { activeTab, handleTabChange };
};
