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
  const hasUsedLink = useRef(false);

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
    if (!hasUsedLink.current) {
      hasUsedLink.current = true;
      if (linkedMatchId) {
        if (upcomingMatches?.some((match) => match.id === linkedMatchId)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- opens the linked match's tab once data loads (intentional)
          handleTabChange('upcoming');
          return;
        }
        if (completedMatches?.some((match) => match.id === linkedMatchId)) {
          handleTabChange('completed');
          return;
        }
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    // Past dates → show completed matches
    if (selected < today) {
      handleTabChange('completed');
      return;
    }

    // Today / future: prefer upcoming matches, then timeslots
    if (upcomingMatches && upcomingMatches.length > 0) {
      handleTabChange('upcoming');
      return;
    }

    handleTabChange('timeslots');
  }, [
    selectedDate,
    matchesLoading,
    timeslotsLoading,
    upcomingMatches,
    completedMatches,
    linkedMatchId,
  ]);

  return { activeTab, handleTabChange };
};
