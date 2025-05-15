
import { useCallback } from 'react';
import { TeamPairingMap, MatchConversionOptions } from '@/types/autoSchedule';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';
import { PreviewMatch } from './types';
import { useToast } from '@/hooks/use-toast';

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
      
      if (options.dualMatchMode && blocks.length >= 2) {
        // Identify primary and secondary blocks
        const primaryBlock = blocks[0];
        const secondaryBlock = blocks[1];
        
        // First, process primary block matches
        pairings[primaryBlock].forEach((pairing, index) => {
          const timeslot = TIME_BLOCKS[primaryBlock].main;
          
          // Create match object
          const matchId = Date.now().toString() + '-' + primaryBlock + '-' + index;
          matches.push({
            id: matchId,
            team1Id: pairing.team1.id,
            team2Id: pairing.team2.id,
            timeslot,
            blockType: 'primary'
          });
          
          // Track team participation and opponents
          [pairing.team1.id, pairing.team2.id].forEach(teamId => {
            if (!teamMatchCounts[teamId]) {
              teamMatchCounts[teamId] = { matchCount: 0, opponents: [] };
            }
            teamMatchCounts[teamId].primaryBlock = primaryBlock;
            teamMatchCounts[teamId].matchCount++;
            teamMatchCounts[teamId].opponents.push(
              teamId === pairing.team1.id ? pairing.team2.id : pairing.team1.id
            );
          });
        });
        
        // Then, process secondary block matches
        pairings[secondaryBlock].forEach((pairing, index) => {
          const timeslot = TIME_BLOCKS[secondaryBlock].secondary;
          
          // Create match object
          const matchId = Date.now().toString() + '-' + secondaryBlock + '-' + index;
          matches.push({
            id: matchId,
            team1Id: pairing.team1.id,
            team2Id: pairing.team2.id,
            timeslot,
            blockType: 'secondary'
          });
          
          // Track team participation and ensure no repeat opponents
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
        
        // Log metrics about dual matches
        const teamsWithBothMatches = Object.values(teamMatchCounts).filter(tc => tc.matchCount === 2).length;
        const teamsWithOneMatch = Object.values(teamMatchCounts).filter(tc => tc.matchCount === 1).length;
        const teamsWithDuplicateOpponents = Object.values(teamMatchCounts).filter(tc => 
          tc.matchCount === 2 && tc.opponents.length < 2
        ).length;
        
        console.log("Dual match conversion metrics:", {
          teamsWithBothMatches,
          teamsWithOneMatch,
          teamsWithDuplicateOpponents
        });
        
        // Warn if any teams have duplicate opponents
        if (teamsWithDuplicateOpponents > 0) {
          console.warn(`${teamsWithDuplicateOpponents} teams have the same opponent in both blocks`);
        }
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
