
import React from 'react';
import { Ranking, ProcessedTeam, TeamDataProcessorResult, DivisionMappingResult } from '../types';

export const useTeamDataProcessor = (
  rankings: Ranking[] | null,
  divisionMapping: DivisionMappingResult,
  isDataReady: boolean
): TeamDataProcessorResult => {
  const processedTeams = React.useMemo(() => {
    if (!isDataReady || !rankings || !Array.isArray(rankings)) {
      console.log("useTeamDataProcessor: No rankings data available or data not ready");
      return [];
    }

    try {
      return rankings.map((ranking, index) => {
        // Map division name to proper division ID UUID
        const divisionId = ranking.divisionName ? divisionMapping.mapDivisionName(ranking.divisionName) : null;
        
        console.log("useTeamDataProcessor: Mapping team", {
          teamName: ranking.teamName,
          divisionName: ranking.divisionName,
          mappedDivisionId: divisionId
        });

        const processedTeam: ProcessedTeam = {
          id: ranking.teamId,
          name: ranking.teamName,
          logoUrl: ranking.imageUrl,
          imageUrl: ranking.imageUrl,
          seed: index + 1, // This is the correct seed based on rankings
          powerScore: ranking.powerScore,
          wins: ranking.wins,
          losses: ranking.losses,
          division_id: divisionId, // Use properly mapped division UUID
          divisionName: ranking.divisionName,
          players: [],
          created_at: new Date().toISOString(),
          game_wins: ranking.gamesWon,
          game_losses: ranking.gamesLost,
          sos: ranking.sos,
          power_score: ranking.powerScore,
          win_percentage: ranking.winPercentage,
          game_win_percentage: ranking.gameWinPercentage,
          close_match_losses: ranking.closeMatchLosses || 0
        };

        return processedTeam;
      });
    } catch (error) {
      console.error("useTeamDataProcessor: Error converting rankings to teams:", error);
      return [];
    }
  }, [rankings, divisionMapping, isDataReady]);

  const processingError = React.useMemo(() => {
    if (!isDataReady) return null;
    if (!rankings) return "Failed to load team rankings";
    if (rankings.length === 0) return "No teams found in rankings";
    return null;
  }, [rankings, isDataReady]);

  return {
    processedTeams,
    processingError
  };
};
