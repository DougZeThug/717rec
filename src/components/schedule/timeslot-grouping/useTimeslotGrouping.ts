import { useCallback, useMemo, useState } from 'react';

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

export const useTimeslotGrouping = (groupedTimeslots: Record<string, TeamTimeslot[]>) => {
  const [expandedTimeslots, setExpandedTimeslots] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    const sortedTimeslots = Object.keys(groupedTimeslots).sort(sortTimeslotKeys);
    sortedTimeslots.forEach((timeslot, index) => {
      initialState[timeslot] = index === 0;
    });
    return initialState;
  });

  const { regularTimeslots, byeWeekTimeslots, doubleHeaderInfo } = useMemo(() => {
    const orderedEntries = Object.entries(groupedTimeslots).sort(([a], [b]) => sortTimeslotKeys(a, b));
    const allTimeslots = orderedEntries.flatMap(([, teams]) => teams);
    const doubleHeaderTeams = new Map<string, { slot1: string; slot2: string }>();
    const seenDoubleHeaderTeams = new Set<string>();

    allTimeslots.forEach((ts) => {
      if (!ts.is_double_header || doubleHeaderTeams.has(ts.team_id)) return;

      const teamSlots = allTimeslots
        .filter((t) => t.team_id === ts.team_id && t.is_double_header)
        .sort((a, b) => (a.match_sequence || 0) - (b.match_sequence || 0));

      if (teamSlots.length === 2) {
        doubleHeaderTeams.set(ts.team_id, {
          slot1: teamSlots[0].timeslot,
          slot2: teamSlots[1].timeslot,
        });
      }
    });

    const processed = orderedEntries.map(([timeslot, teams]) => {
      const filteredTeams = teams.filter((ts) => {
        if (!ts.is_double_header) return true;
        if (seenDoubleHeaderTeams.has(ts.team_id)) return false;
        seenDoubleHeaderTeams.add(ts.team_id);
        return true;
      });

      return { timeslot, teams: filteredTeams };
    });

    return {
      regularTimeslots: processed.filter((entry) => entry.timeslot !== 'BYE') as TimeslotSection[],
      byeWeekTimeslots: processed.filter((entry) => entry.timeslot === 'BYE') as TimeslotSection[],
      doubleHeaderInfo: doubleHeaderTeams,
    };
  }, [groupedTimeslots]);

  const toggleTimeslot = useCallback((timeslot: string) => {
    setExpandedTimeslots((prev) => ({ ...prev, [timeslot]: !prev[timeslot] }));
  }, []);

  return { regularTimeslots, byeWeekTimeslots, doubleHeaderInfo, expandedTimeslots, toggleTimeslot };
};
