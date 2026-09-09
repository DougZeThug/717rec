import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { createDateWithTime } from '@/components/schedule/form-utils';
import { useToast } from '@/hooks/useToast';
import {
  batchCreateMatches,
  fetchActiveSeason,
  MatchCreateData,
} from '@/services/matches/MatchWriteService';
import { Team } from '@/types';
import { ALL_BLOCK_TIMES } from '@/utils/autoSchedule/constants';
import { nextThursday } from '@/utils/leagueNight';
import { errorLog, matchLog, timezoneLog } from '@/utils/logger';

import { MatchPair } from './MatchPairsList';

/** "team 1", "team 1 and team 2", "team 1, team 2 and a timeslot". */
const formatList = (parts: string[]): string => {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
};

export const useBatchMatchForm = (_teams: Team[]) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => nextThursday());
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>([
    { id: '1', team1Id: null, team2Id: null, timeslot: null },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMatchPair = () => {
    setMatchPairs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        team1Id: null,
        team2Id: null,
        timeslot: null,
      },
    ]);
  };

  const updateMatchPair = (id: string, updates: Partial<MatchPair>) => {
    setMatchPairs(matchPairs.map((pair) => (pair.id === id ? { ...pair, ...updates } : pair)));
  };

  const removeMatchPair = (id: string) => {
    setMatchPairs(matchPairs.filter((pair) => pair.id !== id));
  };

  const autoAssignTimeslots = () => {
    // ALL_BLOCK_TIMES is the league's real list of start times, derived from the
    // back-to-back block pairs the scheduler works in. The copy that used to live
    // here also offered 10:00 PM, which no block starts and nothing else in the
    // app will hand out.
    const updatedPairs = matchPairs.map((pair, index) => ({
      ...pair,
      timeslot: ALL_BLOCK_TIMES[index % ALL_BLOCK_TIMES.length],
    }));
    setMatchPairs(updatedPairs);
  };

  /**
   * Says what is missing and which row it is missing from.
   *
   * This used to stop at the first bad row and toast "Please fill in all match
   * details", with nothing on screen marking the row — on a twenty-match night
   * that is a hunt (UX audit A-18). Every row is checked, the errors are kept
   * against the row's id so the list can mark them, and the toast names the
   * rows rather than the whole form.
   */
  const validateMatches = () => {
    if (!selectedDate) {
      setRowErrors({});
      toast({
        title: 'Pick a date',
        description: 'Choose the night these matches are played on.',
        variant: 'destructive',
      });
      return false;
    }

    const errors: Record<string, string> = {};
    const teamRow = new Map<string, number>();

    matchPairs.forEach((pair, index) => {
      const rowNumber = index + 1;
      const missing: string[] = [];
      if (!pair.team1Id) missing.push('team 1');
      if (!pair.team2Id) missing.push('team 2');
      if (!pair.timeslot) missing.push('a timeslot');

      if (missing.length > 0) {
        errors[pair.id] = `Match ${rowNumber} still needs ${formatList(missing)}.`;
        return;
      }

      if (pair.team1Id === pair.team2Id) {
        errors[pair.id] = `Match ${rowNumber} has the same team on both sides.`;
        return;
      }

      for (const teamId of [pair.team1Id, pair.team2Id] as string[]) {
        const firstRow = teamRow.get(teamId);
        if (firstRow !== undefined) {
          errors[pair.id] =
            `Match ${rowNumber} uses a team already playing in match ${firstRow}. ` +
            'A team can only play once a night.';
          return;
        }
      }

      teamRow.set(pair.team1Id as string, rowNumber);
      teamRow.set(pair.team2Id as string, rowNumber);
    });

    setRowErrors(errors);

    const badRows = Object.keys(errors);
    if (badRows.length === 0) return true;

    toast({
      title: 'Missing details',
      description:
        badRows.length === 1
          ? errors[badRows[0]]
          : `${badRows.length} matches need fixing. Each one is marked below.`,
      variant: 'destructive',
    });
    return false;
  };

  const handleSubmit = async (): Promise<boolean> => {
    if (!validateMatches()) return false;

    setIsSubmitting(true);

    try {
      // Get active season using service layer
      const activeSeasonId = await fetchActiveSeason();

      // Courts are numbered within a timeslot, not across the night: two matches
      // at 6:30 are on courts 1 and 2, and 7:00 starts again at court 1. The old
      // numbering used the row's position in the whole list, so the last match of
      // the evening claimed "Court 20" (UX audit A-18).
      const courtsUsed = new Map<string, number>();

      const matchesToCreate: MatchCreateData[] = matchPairs.map((pair) => {
        // Validation already required a timeslot; this only satisfies the type.
        const timeslot = pair.timeslot ?? ALL_BLOCK_TIMES[0];
        const court = (courtsUsed.get(timeslot) ?? 0) + 1;
        courtsUsed.set(timeslot, court);

        // Use our updated utility to create a UTC date for storage
        const dateWithTime = createDateWithTime(selectedDate as Date, timeslot);

        timezoneLog('Creating match with UTC time:', {
          localTimeslot: timeslot,
          utcDate: dateWithTime.toISOString(),
          utcHours: dateWithTime.getUTCHours(),
          utcMinutes: dateWithTime.getUTCMinutes(),
          utcDay: dateWithTime.getUTCDate(),
        });

        return {
          team1_id: pair.team1Id,
          team2_id: pair.team2Id,
          date: dateWithTime.toISOString(),
          location: `Court ${court}`,
          iscompleted: false,
          round_number: 0,
          team1_score: 0,
          team2_score: 0,
          team1_game_wins: 0,
          team2_game_wins: 0,
          season_id: activeSeasonId,
        };
      });

      matchLog('Batch creating matches:', matchesToCreate);

      const data = await batchCreateMatches(matchesToCreate);

      matchLog('Successfully created matches:', data);

      const created = matchPairs.length;
      toast({
        title: 'Matches created',
        description: `Created ${created} ${created === 1 ? 'match' : 'matches'} for ${selectedDate?.toLocaleDateString()}`,
      });

      // Invalidate queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['matches'] });

      // Reset form
      setRowErrors({});
      setMatchPairs([{ id: '1', team1Id: null, team2Id: null, timeslot: null }]);
      setSelectedDate(nextThursday());

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Could not create the matches',
        description: message,
        variant: 'destructive',
      });
      errorLog('Error creating matches:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedDate,
    setSelectedDate,
    matchPairs,
    setMatchPairs,
    isSubmitting,
    rowErrors,
    addMatchPair,
    updateMatchPair,
    removeMatchPair,
    autoAssignTimeslots,
    handleSubmit,
  };
};
