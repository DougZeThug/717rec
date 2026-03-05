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
import { errorLog, matchLog, timezoneLog } from '@/utils/logger';
import { normalizeTimeFormat } from '@/utils/timeUtils';
import { formatTimeToUTC } from '@/utils/timezone/converters';

import { MatchPair } from './MatchPairsList';

function getNextThursday(): Date {
  const today = new Date();
  const day = today.getDay();
  const daysUntilThursday = (4 - day + 7) % 7;
  const thursday = new Date(today);
  thursday.setDate(today.getDate() + (daysUntilThursday === 0 ? 0 : daysUntilThursday));
  thursday.setHours(12, 0, 0, 0);
  return thursday;
}

export const useBatchMatchForm = (teams: Team[]) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(getNextThursday());
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>([
    { id: '1', team1Id: null, team2Id: null, timeslot: null },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMatchPair = () => {
    setMatchPairs([
      ...matchPairs,
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
    // Use standard 12-hour format for consistency - now includes 5:00 PM and 5:30 PM
    const timeslots = [
      '5:00 PM',
      '5:30 PM',
      '6:00 PM',
      '6:30 PM',
      '7:00 PM',
      '7:30 PM',
      '8:00 PM',
      '8:30 PM',
      '9:00 PM',
      '9:30 PM',
      '10:00 PM',
    ];
    const updatedPairs = matchPairs.map((pair, index) => ({
      ...pair,
      timeslot: timeslots[index % timeslots.length],
    }));
    setMatchPairs(updatedPairs);
  };

  const validateMatches = () => {
    if (!selectedDate) {
      toast({
        title: 'Error',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return false;
    }

    const usedTeams = new Set<string>();
    for (const pair of matchPairs) {
      if (!pair.team1Id || !pair.team2Id || !pair.timeslot) {
        toast({
          title: 'Error',
          description: 'Please fill in all match details',
          variant: 'destructive',
        });
        return false;
      }

      if (usedTeams.has(pair.team1Id) || usedTeams.has(pair.team2Id)) {
        toast({
          title: 'Error',
          description: 'Teams cannot be used in multiple matches',
          variant: 'destructive',
        });
        return false;
      }

      usedTeams.add(pair.team1Id);
      usedTeams.add(pair.team2Id);
    }

    return true;
  };

  const handleSubmit = async (): Promise<boolean> => {
    if (!validateMatches()) return false;

    setIsSubmitting(true);

    try {
      // Get active season using service layer
      const activeSeasonId = await fetchActiveSeason();

      const matchesToCreate: MatchCreateData[] = matchPairs.map((pair) => {
        // Ensure the timeslot is properly formatted
        const timeslot = pair.timeslot || '6:30 PM'; // Default to 6:30 PM if missing

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
          location: `Court ${matchPairs.indexOf(pair) + 1}`,
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

      toast({
        title: 'Success',
        description: `Created ${matchPairs.length} matches for ${selectedDate?.toLocaleDateString()}`,
      });

      // Invalidate queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['matches'] });

      // Reset form
      setMatchPairs([{ id: '1', team1Id: null, team2Id: null, timeslot: null }]);
      setSelectedDate(getNextThursday());

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
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
    addMatchPair,
    updateMatchPair,
    removeMatchPair,
    autoAssignTimeslots,
    handleSubmit,
  };
};
