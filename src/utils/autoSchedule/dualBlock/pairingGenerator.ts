
import { TeamPairing, TeamPairingMap, TimeBlockTeamsMap, PairingResult, DualBlockConfig } from '@/types/autoSchedule';
import { Team } from '@/types';
import { NotificationCallback } from '@/types/dualBlock';
import { validateDualBlockTeams, handleOddTeamCount, createCrossBlockCompatibilityAdjuster } from '../dualBlockUtils';
import { generatePairingsWithConfig } from '../pairingAlgorithm';
import { calculateConfigurableCompatibility } from '../compatibilityUtils';
import { haveTeamsPlayedBefore } from '../matchHistoryService';
import { findTeamsWithSameOpponent } from './opponentUtils';

/**
 * Generate dual block pairings
 * This function generates pairings for two linked time blocks (typically Early and Late)
 * ensuring teams play in both blocks with different opponents
 * 
 * @param timeBlockTeams - Map of time blocks to teams
 * @param config - Configuration for the dual block pairing
 * @param notifyCallback - Optional callback for notifications
 * @returns Pairings result or null if generation failed
 */
export const generateDualBlockPairings = async (
  timeBlockTeams: Record<string, Team[]>,
  config: DualBlockConfig = {},
  notifyCallback?: NotificationCallback
): Promise<PairingResult | null> => {
  try {
    // Get primary and secondary block names
    const primaryBlock = config.primaryBlock || 'Early';
    const secondaryBlock = config.secondaryBlock || 'Late';
    
    // Ensure both blocks exist in the timeBlockTeams
    if (!timeBlockTeams[primaryBlock] || !timeBlockTeams[secondaryBlock]) {
      console.error(`Missing required blocks for dual mode: ${primaryBlock} or ${secondaryBlock}`);
      
      if (notifyCallback) {
        notifyCallback({
          title: "Configuration Error",
          description: `Dual match mode requires teams in both ${primaryBlock} and ${secondaryBlock} blocks.`,
          variant: "destructive"
        });
      }
      
      return null;
    }
    
    // Track teams that will participate in both blocks
    const primaryTeams = timeBlockTeams[primaryBlock];
    const secondaryTeams = timeBlockTeams[secondaryBlock];
    
    // First generate optimal pairings for the primary block
    console.log(`Generating primary block pairings for ${primaryTeams.length} teams`);
    const primaryPairings = await generatePairingsWithConfig(primaryTeams, {
      avoidRematches: config.avoidRematches,
      haveTeamsPlayedFn: haveTeamsPlayedBefore,
      getCompatibilityScoreFn: (team1, team2) => calculateConfigurableCompatibility(team1, team2, {
        ...config.weights,
        tierPenalty: { 
          sameTier: 0, 
          oneTierDiff: config.weights?.divisionWeight ?? 4, 
          twoTierDiff: (config.weights?.divisionWeight ?? 4) * 2 
        }
      })
    });
    
    // Create a map of team IDs to their opponents in the primary block
    const primaryOpponents: Record<string, string> = {};
    primaryPairings.forEach(pairing => {
      primaryOpponents[pairing.team1.id] = pairing.team2.id;
      primaryOpponents[pairing.team2.id] = pairing.team1.id;
    });
    
    // Create constraints for secondary block to ensure teams have different opponents
    const secondaryConstraints = {
      avoidRematches: config.avoidRematches,
      haveTeamsPlayedFn: haveTeamsPlayedBefore,
      getCompatibilityScoreFn: (team1: Team, team2: Team) => {
        // Base compatibility score with division weighting
        let score = calculateConfigurableCompatibility(team1, team2, {
          ...config.weights,
          tierPenalty: { 
            sameTier: 0, 
            oneTierDiff: config.weights?.divisionWeight ?? 4, 
            twoTierDiff: (config.weights?.divisionWeight ?? 4) * 2 
          }
        });
        
        // Penalize heavily if teams are already opponents in the primary block
        if (primaryOpponents[team1.id] === team2.id || primaryOpponents[team2.id] === team1.id) {
          score -= 1000; // Large penalty to avoid same opponents
        }
        
        return score;
      }
    };
    
    // Generate secondary block pairings with constraints
    console.log(`Generating secondary block pairings for ${secondaryTeams.length} teams with opponent constraints`);
    const secondaryPairings = await generatePairingsWithConfig(secondaryTeams, secondaryConstraints);
    
    // Combine pairings into a TeamPairingMap
    const pairingsMap: TeamPairingMap = {};
    pairingsMap[primaryBlock] = primaryPairings;
    pairingsMap[secondaryBlock] = secondaryPairings;
    
    // Find teams that weren't matched (odd number of teams)
    const allTeamIds = new Set([
      ...primaryTeams.map(t => t.id),
      ...secondaryTeams.map(t => t.id)
    ]);
    
    const matchedTeamIds = new Set();
    
    // Add all matched teams from both blocks
    Object.values(pairingsMap).forEach(blockPairings => {
      blockPairings.forEach(pairing => {
        matchedTeamIds.add(pairing.team1.id);
        matchedTeamIds.add(pairing.team2.id);
      });
    });
    
    // Get unmatched team IDs
    const unmatchedTeamIds: string[] = [];
    allTeamIds.forEach(teamId => {
      if (!matchedTeamIds.has(teamId)) {
        unmatchedTeamIds.push(teamId);
      }
    });
    
    // If teams have the same opponent in both blocks, log and track them
    const teamsWithSameOpponent = findTeamsWithSameOpponent(primaryPairings, secondaryPairings);
    if (teamsWithSameOpponent.length > 0) {
      console.warn(`Session rematch detected: ${teamsWithSameOpponent.length} teams have the same opponent in both blocks`);
      
      // Look up team names for better logging
      const teamNameMap = new Map<string, string>();
      [...primaryTeams, ...secondaryTeams].forEach(team => {
        teamNameMap.set(team.id, team.name);
      });
      
      teamsWithSameOpponent.forEach(teamId => {
        const teamName = teamNameMap.get(teamId) || `Team ${teamId}`;
        console.warn(`  ${teamName} plays the same opponent in both blocks`);
      });
      
      if (notifyCallback) {
        notifyCallback({
          title: "Session Rematch Warning",
          description: `${teamsWithSameOpponent.length} teams have the same opponent in both blocks. This violates session-level rematch prevention.`,
          variant: "destructive"
        });
      }
    } else {
      console.log('Session rematch validation passed: All teams have different opponents in each block');
    }
    
    return {
      pairings: pairingsMap,
      unmatchedTeamIds
    };
    
  } catch (error) {
    console.error("Error generating dual block pairings:", error);
    
    if (notifyCallback) {
      notifyCallback({
        title: "Error",
        description: "Failed to generate dual block pairings.",
        variant: "destructive"
      });
    }
    
    return null;
  }
};
