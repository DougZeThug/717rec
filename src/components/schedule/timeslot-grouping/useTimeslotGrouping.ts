import { useCallback, useEffect, useMemo, useState } from 'react';

import { TeamTimeslot } from '@/types';

interface TimeslotSection {
  timeslot: string;
  teams: TeamTimeslot[];
}

const sortTimeslotKeys = (a: string, b: string): number => {
  if (a === 'BYE' && b !== 'BYE') return 1;
  if (a !== 'BYE' && b === 'BYE') return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

const buildInitialExpandedState = (groupedTimeslots: Record<string, TeamTimeslot[]>) => {
  const initialState: Record<string, boolean> = {};
  const sortedTimeslots = Object.keys(groupedTimeslots).sort(sortTimeslotKeys);
  sortedTimeslots.forEach((timeslot, index) => {
    initialState[timeslot] = index === 0;
  });
  return initialState;
};

export const useTimeslotGrouping = (groupedTimeslots: Record<string, TeamTimeslot[]>) => {
  const [expandedTimeslots, setExpandedTimeslots] = useState<Record<string, boolean>>(() =>
    buildInitialExpandedState(groupedTimeslots)
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
    setExpandedTimeslots(buildInitialExpandedState(groupedTimeslots));
  }, [groupedTimeslots]);

  const { regularTimeslots, byeWeekTimeslots, doubleHeaderInfo } = useMemo(() => {
    const orderedEntries = Object.entries(groupedTimeslots).sort(([a], [b]) =>
      sortTimeslotKeys(a, b)
    );
    const allTimeslots = orderedEntries.flatMap(([, teams]) => teams);
    // Start times of every booking a team has that night (two for a double
    // header, three for the rare triple header). Only the first slot of each
    // back-to-back pair is a real start time.
    const doubleHeaderTeams = new Map<string, string[]>();
    const seenDoubleHeaderTeams = new Set<string>();

    allTimeslots.forEach((ts) => {
      if (!ts.is_double_header || doubleHeaderTeams.has(ts.team_id)) return;
      const teamSlots = allTimeslots.filter((t) => t.team_id === ts.team_id && t.is_double_header);
      const startTimes = [
        ...new Set(teamSlots.filter((t) => (t.match_sequence ?? 1) === 1).map((t) => t.timeslot)),
      ].sort(sortTimeslotKeys);

      if (startTimes.length >= 2) {
        doubleHeaderTeams.set(ts.team_id, startTimes);
      }
    });

    const processed = orderedEntries.map(([timeslot, teams]) => ({
      timeslot,
      teams: teams.filter((ts) => {
        if (!ts.is_double_header) return true;
        if (seenDoubleHeaderTeams.has(ts.team_id)) return false;
        seenDoubleHeaderTeams.add(ts.team_id);
        return true;
      }),
    }));

    return {
      regularTimeslots: processed.filter((entry) => entry.timeslot !== 'BYE') as TimeslotSection[],
      byeWeekTimeslots: processed.filter((entry) => entry.timeslot === 'BYE') as TimeslotSection[],
      doubleHeaderInfo: doubleHeaderTeams,
    };
  }, [groupedTimeslots]);

  const toggleTimeslot = useCallback((timeslot: string) => {
    setExpandedTimeslots((prev) => ({ ...prev, [timeslot]: !prev[timeslot] }));
  }, []);

  return {
    regularTimeslots,
    byeWeekTimeslots,
    doubleHeaderInfo,
    expandedTimeslots,
    toggleTimeslot,
  };
};
