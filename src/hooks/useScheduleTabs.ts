import { useEffect, useRef, useState } from 'react';

const SCHEDULE_TAB_KEY = 'scheduleActiveTab';

interface UseScheduleTabsOptions {
  selectedDate: Date;
  matchesLoading: boolean;
  timeslotsLoading: boolean;
  upcomingMatches: unknown[] | undefined;
  groupedTimeslots: Record<string, unknown[]>;
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
 */
export const useScheduleTabs = ({
  selectedDate,
  matchesLoading,
  timeslotsLoading,
  upcomingMatches,
  groupedTimeslots,
}: UseScheduleTabsOptions): UseScheduleTabsResult => {
  const [activeTab, setActiveTab] = useState<string>(
    () => sessionStorage.getItem(SCHEDULE_TAB_KEY) || 'timeslots'
  );
  const hasInitializedTab = useRef(false);

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
  }, [selectedDate, matchesLoading, timeslotsLoading, upcomingMatches, groupedTimeslots]);

  return { activeTab, handleTabChange };
};
