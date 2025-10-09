
import { useCallback } from 'react';
import { TeamPairingMap, MatchConversionOptions } from '@/types/autoSchedule';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';
import { PreviewMatch } from './types';
import { useToast } from '@/hooks/use-toast';
import { calculateDualBlockMetrics, findTeamsWithSameOpponent } from '@/utils/autoSchedule/dualBlock';

export const useMatchConverter = () => {
  const { toast } = useToast();

  // Convert team pairings to match objects for form
  // Enhanced with dual match mode support
  const convertPairingsToMatches = useCallback((
    pairings: TeamPairingMap,
    date: Date,
    options: MatchConversionOptions = {}
  ): PreviewMatch[] => {
    if (!pairings || !date) {
      return [];
    }
    
    try {
      const matches: PreviewMatch[] = [];
      
      // Get the blocks (keys) from the pairings
      const blocks = Object.keys(pairings);
      
      // For dual match mode, we need to track teams to ensure they have matches in both blocks
      const teamMatchCounts: Record<string, {
        primaryBlock?: string;
        matchCount: number;
        opponents: string[];
      }> = {};
      
      if (options.dualMatchMode) {
        // In dual match mode, pairings are keyed by actual timeslot (e.g., "6:30 PM", "7:00 PM")
        // Process each timeslot independently
        console.log("Converting dual match pairings - timeslots:", Object.keys(pairings));
        
        Object.entries(pairings).forEach(([timeslot, blockPairings]) => {
          blockPairings.forEach((pairing, index) => {
            // Use the timeslot directly from the key
            const matchId = Date.now().toString() + '-' + timeslot + '-' + index;
            matches.push({
              id: matchId,
              team1Id: pairing.team1.id,
              team2Id: pairing.team2.id,
              timeslot, // Use actual timeslot
              blockType: 'primary' // Not really relevant anymore since we use actual timeslots
            });
            
            // Track team participation
            [pairing.team1.id, pairing.team2.id].forEach(teamId => {
              if (!teamMatchCounts[teamId]) {
                teamMatchCounts[teamId] = { matchCount: 0, opponents: [] };
              }
              teamMatchCounts[teamId].matchCount++;
              teamMatchCounts[teamId].opponents.push(
                teamId === pairing.team1.id ? pairing.team2.id : pairing.team1.id
              );
            });
          });
        });
        
        console.log(`Converted ${matches.length} matches across ${Object.keys(pairings).length} timeslots`)
      } else {
        // Standard single-block conversion logic
        Object.entries(pairings).forEach(([block, blockPairings]) => {
          // Skip if block doesn't exist in TIME_BLOCKS
          if (!TIME_BLOCKS[block]) {
            console.error(`Missing time block data for ${block}`);
            return;
          }
          
          blockPairings.forEach((pairing, index) => {
            // Alternate between main and secondary timeslots
            const timeslot = index % 2 === 0 
              ? TIME_BLOCKS[block].main 
              : TIME_BLOCKS[block].secondary;
            
            matches.push({
              id: Date.now().toString() + '-' + block + '-' + index,
              team1Id: pairing.team1.id,
              team2Id: pairing.team2.id,
              timeslot,
            });
          });
        });
      }
      
      return matches;
    } catch (error) {
      console.error('Error converting pairings to matches:', error);
      toast({
        title: "Error",
        description: "Failed to convert pairings to matches",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  // New function to check dual match validity
  const validateDualMatches = useCallback((matches: PreviewMatch[]): {
    valid: boolean;
    teamsWithDuplicateOpponents: string[];
    teamsWithOnlyOneMatch: string[];
  } => {
    const teamMatches: Record<string, { 
      opponents: string[],
      matchIds: string[]
    }> = {};
    
    // Build team match data
    matches.forEach(match => {
      // Process team1
      if (!teamMatches[match.team1Id]) {
        teamMatches[match.team1Id] = { opponents: [], matchIds: [] };
      }
      teamMatches[match.team1Id].opponents.push(match.team2Id);
      teamMatches[match.team1Id].matchIds.push(match.id);
      
      // Process team2
      if (!teamMatches[match.team2Id]) {
        teamMatches[match.team2Id] = { opponents: [], matchIds: [] };
      }
      teamMatches[match.team2Id].opponents.push(match.team1Id);
      teamMatches[match.team2Id].matchIds.push(match.id);
    });
    
    // Find teams with duplicate opponents or only one match
    const teamsWithDuplicateOpponents: string[] = [];
    const teamsWithOnlyOneMatch: string[] = [];
    
    Object.entries(teamMatches).forEach(([teamId, data]) => {
      // Check for teams with only one match
      if (data.matchIds.length === 1) {
        teamsWithOnlyOneMatch.push(teamId);
      }
      
      // Check for duplicate opponents
      const uniqueOpponents = new Set(data.opponents);
      if (uniqueOpponents.size < data.opponents.length) {
        teamsWithDuplicateOpponents.push(teamId);
      }
    });
    
    return {
      valid: teamsWithDuplicateOpponents.length === 0,
      teamsWithDuplicateOpponents,
      teamsWithOnlyOneMatch
    };
  }, []);

  return {
    convertPairingsToMatches,
    validateDualMatches
  };
};
