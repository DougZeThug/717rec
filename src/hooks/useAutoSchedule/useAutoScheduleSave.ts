import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { createDateWithTime } from '@/components/schedule/form-utils';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { AutoScheduleMatch } from '@/types/autoSchedule';
import { errorLog, scheduleLog } from '@/utils/logger';

import { clearAutoScheduleState } from './storage';

export function useAutoScheduleSave() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMatches = async (
    matches: AutoScheduleMatch[],
    selectedDate: Date | null,
    dualMatchMode: boolean = false,
    seasonId?: string | null
  ): Promise<boolean> => {
    if (!selectedDate || !matches || matches.length === 0) {
      toast({
        title: 'Error',
        description: 'No matches to save or date not selected',
        variant: 'destructive',
      });
      return false;
    }

    setIsSaving(true);

    try {
      // Use provided seasonId to avoid redundant fetch
      let activeSeasonId = seasonId;

      // Fallback: fetch active season if not provided (backwards compatibility)
      if (!activeSeasonId) {
        const { data: activeSeason, error: seasonError } = await supabase
          .from('seasons')
          .select('id')
          .eq('is_active', true)
          .maybeSingle();

        if (seasonError) throw seasonError;
        activeSeasonId = activeSeason?.id;
      }

      // Validate matches based on mode
      if (dualMatchMode) {
        // In dual match mode: teams can appear in up to 4 matches (double headers = 2 back-to-back pairs)
        // Regular teams: 2 matches (1 back-to-back pair)
        // Double header teams: 4 matches (2 back-to-back pairs)
        // Validation ensures:
        // 1. Max 4 matches per team
        // 2. No duplicate timeslots (can't play 2 matches at same time)
        // 3. No duplicate opponents (can't play same team twice)
        const teamAppearances = new Map<string, string[]>();
        const teamOpponents = new Map<string, Set<string>>();
        // Build a map of team IDs to names for better error messages
        const teamNames = new Map<string, string>();
        matches.forEach((m) => {
          // Try to extract team names from match metadata if available
          teamNames.set(m.team1Id, m.team1Id);
          teamNames.set(m.team2Id, m.team2Id);
        });

        for (const match of matches) {
          if (!match.team1Id || !match.team2Id) {
            throw new Error('Invalid match data: missing team IDs');
          }

          const { team1Id, team2Id, timeslot } = match;

          // Check team1 appearances - allow up to 4 for double headers
          const team1Slots = teamAppearances.get(team1Id) || [];
          if (team1Slots.length >= 4) {
            errorLog(`Team ${team1Id} already has 4 matches:`, team1Slots);
            throw new Error(
              `Team ${team1Id} appears in more than 4 matches (max for double headers). Existing slots: ${team1Slots.join(', ')}`
            );
          }
          if (team1Slots.includes(timeslot)) {
            errorLog(`Team ${team1Id} has duplicate timeslot ${timeslot}:`, team1Slots);
            throw new Error(
              `Team ${team1Id} has duplicate matches in timeslot ${timeslot}`
            );
          }
          team1Slots.push(timeslot);
          teamAppearances.set(team1Id, team1Slots);

          // Check team2 appearances - allow up to 4 for double headers
          const team2Slots = teamAppearances.get(team2Id) || [];
          if (team2Slots.length >= 4) {
            errorLog(`Team ${team2Id} already has 4 matches:`, team2Slots);
            throw new Error(
              `Team ${team2Id} appears in more than 4 matches (max for double headers). Existing slots: ${team2Slots.join(', ')}`
            );
          }
          if (team2Slots.includes(timeslot)) {
            errorLog(`Team ${team2Id} has duplicate timeslot ${timeslot}:`, team2Slots);
            throw new Error(
              `Team ${team2Id} has duplicate matches in timeslot ${timeslot}`
            );
          }
          team2Slots.push(timeslot);
          teamAppearances.set(team2Id, team2Slots);

          // Check for duplicate opponents
          const team1OpponentSet = teamOpponents.get(team1Id) || new Set();
          if (team1OpponentSet.has(team2Id)) {
            errorLog(
              `Duplicate opponent detected: ${team1Id} vs ${team2Id}`,
              { team1Opponents: Array.from(team1OpponentSet), timeslot }
            );
            throw new Error(
              `Teams ${team1Id} and ${team2Id} are matched against each other multiple times. This can happen with double header teams that share multiple blocks.`
            );
          }
          team1OpponentSet.add(team2Id);
          teamOpponents.set(team1Id, team1OpponentSet);

          const team2OpponentSet = teamOpponents.get(team2Id) || new Set();
          team2OpponentSet.add(team1Id);
          teamOpponents.set(team2Id, team2OpponentSet);
        }
      } else {
        // Single match mode: each team can only appear once
        const teamIds = new Set<string>();
        for (const match of matches) {
          if (!match.team1Id || !match.team2Id) {
            throw new Error('Invalid match data: missing team IDs');
          }
          if (teamIds.has(match.team1Id) || teamIds.has(match.team2Id)) {
            throw new Error('Team appears in multiple matches');
          }
          teamIds.add(match.team1Id);
          teamIds.add(match.team2Id);
        }
      }

      // Transform AutoScheduleMatch to database format
      const matchesToInsert = matches.map((match, index) => {
        // Create UTC date with time
        const dateWithTime = createDateWithTime(selectedDate, match.timeslot);

        return {
          team1_id: match.team1Id,
          team2_id: match.team2Id,
          date: dateWithTime.toISOString(),
          location: `Court ${index + 1}`,
          iscompleted: false,
          round_number: 0,
          team1_score: 0,
          team2_score: 0,
          team1_game_wins: 0,
          team2_game_wins: 0,
          season_id: activeSeasonId || null,
          metadata: {
            timeslot: match.timeslot,
            blockType: match.blockType,
            autoGenerated: true,
            generatedAt: new Date().toISOString(),
            dualMatchMode,
          },
        };
      });

      scheduleLog('Saving auto-generated matches to Supabase:', matchesToInsert);

      // Insert matches
      const { data, error } = await supabase.from('matches').insert(matchesToInsert).select();

      if (error) throw error;

      scheduleLog('Successfully saved matches:', data);

      toast({
        title: 'Success',
        description: `Saved ${matches.length} matches to the database`,
      });

      // Clear persisted state after successful save
      clearAutoScheduleState();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-matches'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save matches to database';
      errorLog('Error saving matches:', error);
      toast({
        title: 'Error Saving Matches',
        description: message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveMatches,
    isSaving,
  };
}
