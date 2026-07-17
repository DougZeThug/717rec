import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { createDateWithTime } from '@/components/schedule/form-utils';
import { useToast } from '@/hooks/useToast';
import { createMatch } from '@/services/matches/MatchWriteService';
import { Match, Team } from '@/types';
import { errorLog } from '@/utils/logger';

export const useMatchCreation = (matches: Match[], setMatches: (matches: Match[]) => void) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const isCreatingRef = useRef(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCreateMatch = async (matchData: Omit<Match, 'id'>, _teams: Team[]) => {
    if (isCreatingRef.current) return false;
    isCreatingRef.current = true;
    setIsCreating(true);
    try {
      // Ensure we have a valid date with proper time
      let dateWithTime = new Date(matchData.date ?? '');

      // If timeSlot is provided in the data, use it to set the time properly
      if (matchData.timeSlot) {
        dateWithTime = createDateWithTime(new Date(matchData.date ?? ''), matchData.timeSlot);
      }

      // Create the match via service (active season is fetched internally)
      const data = await createMatch({
        team1Id: matchData.team1Id,
        team2Id: matchData.team2Id,
        date: dateWithTime.toISOString(),
        location: matchData.location || '',
        team1_game_wins: matchData.team1_game_wins || 0,
        team2_game_wins: matchData.team2_game_wins || 0,
      });

      // Transform the returned match to our app's format
      const newMatch: Match = {
        id: data.id,
        team1Id: data.team1_id ?? matchData.team1Id,
        team2Id: data.team2_id ?? matchData.team2Id,
        date: data.date ?? undefined,
        location: data.location ?? undefined,
        iscompleted: data.iscompleted ?? undefined,
        team1Score: data.team1_score ?? undefined,
        team2Score: data.team2_score ?? undefined,
        winnerId: data.winner_id ?? undefined,
        loserId: data.loser_id ?? undefined,
        team1_game_wins: data.team1_game_wins ?? undefined,
        team2_game_wins: data.team2_game_wins ?? undefined,
        round_number: data.round_number,
        timeSlot: matchData.timeSlot, // Preserve the timeSlot for UI purposes
      };

      setMatches([...matches, newMatch]);
      setIsFormOpen(false);

      toast({
        title: 'Match Created',
        description: 'Match has been successfully scheduled.',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['matches'] });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error creating match:', error);
      toast({
        title: 'Error',
        description: `Failed to create match: ${message}`,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsCreating(false);
      isCreatingRef.current = false;
    }
  };

  return {
    isFormOpen,
    setIsFormOpen,
    handleCreateMatch,
    isCreating,
  };
};
