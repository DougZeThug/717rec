import { PlayoffBracket, PlayoffMatch, PlayoffGame, PlayoffTeam } from '@/utils/playoffs/playoffTypes';
import { ViewerData, ViewerStage, ViewerMatch, ViewerMatchGame, ViewerParticipant, ViewerDataWithMapping } from './types';

export class BracketsViewerAdapter {
  private static teamIdMap: Map<string, number> = new Map();
  
  /**
   * Main transformation function - returns data and ID mapping function
   */
  static transform(
    bracket: PlayoffBracket,
    teams: PlayoffTeam[],
    storedParticipants?: Array<{
      position: number;
      team_id: string;
      name: string;
      logo_url?: string;
      image_url?: string;
    }>
  ): ViewerDataWithMapping {
    // Reset team map for each transformation
    this.teamIdMap.clear();
    
    // Create a local match ID map for this transformation
    const matchIdMap = new Map<string, number>();
    const reverseMatchIdMap = new Map<number, string>();
    
    // Use stored participants if available, otherwise fall back to teams
    const participants = storedParticipants && storedParticipants.length > 0
      ? this.transformStoredParticipants(storedParticipants)
      : this.transformParticipants(teams);
    
    const stage = this.transformBracket(bracket);
    const matches = this.transformMatches(bracket.matches || [], bracket.id, matchIdMap, reverseMatchIdMap);
    const matchGames = this.transformGames(bracket.matches || [], matchIdMap);

    return {
      data: {
        stages: [stage],
        matches,
        matchGames,
        participants
      },
      getPlayoffMatchId: (viewerMatchId: number) => reverseMatchIdMap.get(viewerMatchId)
    };
  }

  /**
   * Transform bracket → stage
   */
  private static transformBracket(bracket: PlayoffBracket): ViewerStage {
    const isDoubleElim = bracket.format === 'Double Elimination';
    
    // Extract grandFinalType from bracket metadata
    let grandFinalType: 'simple' | 'double' | undefined = 'simple';
    if (isDoubleElim && bracket.participants && typeof bracket.participants === 'object') {
      const metadata = bracket.participants as any;
      grandFinalType = metadata.grandFinalType || 'simple';
    }
    
    return {
      id: 1,
      tournament_id: 1,
      name: bracket.name || 'Playoff Bracket',
      type: isDoubleElim ? 'double_elimination' : 'single_elimination',
      number: 1,
      settings: {
        size: this.calculateBracketSize(bracket.matches || []),
        grandFinal: isDoubleElim ? grandFinalType : undefined
      }
    };
  }

  /**
   * Transform stored participants (with seed positions)
   */
  private static transformStoredParticipants(
    storedParticipants: Array<{
      position: number;
      team_id: string;
      name: string;
      logo_url?: string;
      image_url?: string;
    }>
  ): ViewerParticipant[] {
    return storedParticipants
      .sort((a, b) => a.position - b.position)
      .map((participant, index) => {
        const participantId = index + 1;
        this.teamIdMap.set(participant.team_id, participantId);
        
        return {
          id: participantId,
          tournament_id: 1,
          name: participant.name,
          image: participant.logo_url || participant.image_url || undefined
        };
      });
  }

  /**
   * Transform teams → participants (fallback)
   */
  private static transformParticipants(teams: PlayoffTeam[]): ViewerParticipant[] {
    return teams.map((team, index) => {
      const participantId = index + 1;
      this.teamIdMap.set(team.id, participantId);
      
      return {
        id: participantId,
        tournament_id: 1,
        name: team.name,
        image: team.logo_url || team.image_url || undefined
      };
    });
  }

  /**
   * Transform playoff_matches → viewer matches
   */
  private static transformMatches(
    playoffMatches: PlayoffMatch[],
    bracketId: string,
    matchIdMap: Map<string, number>,
    reverseMatchIdMap: Map<number, string>
  ): ViewerMatch[] {
    // Group by match_type
    const winnerMatches = playoffMatches
      .filter(m => m.matchType === 'winners')
      .sort((a, b) => a.round - b.round || a.position - b.position);
    
    const loserMatches = playoffMatches
      .filter(m => m.matchType === 'losers')
      .sort((a, b) => a.round - b.round || a.position - b.position);
    
    const finalMatches = playoffMatches
      .filter(m => m.matchType === 'finals')
      .sort((a, b) => a.round - b.round || a.position - b.position);

    let matches: ViewerMatch[] = [];
    let matchNumber = 1;

    // Transform winner bracket (group 1)
    winnerMatches.forEach(m => {
      const viewerMatch = this.transformMatch(m, 1, 1, matchNumber++);
      matchIdMap.set(m.id, viewerMatch.id);
      reverseMatchIdMap.set(viewerMatch.id, m.id);
      matches.push(viewerMatch);
    });

    // Transform loser bracket (group 2)
    loserMatches.forEach(m => {
      const viewerMatch = this.transformMatch(m, 1, 2, matchNumber++);
      matchIdMap.set(m.id, viewerMatch.id);
      reverseMatchIdMap.set(viewerMatch.id, m.id);
      matches.push(viewerMatch);
    });

    // Transform finals (group 3)
    finalMatches.forEach(m => {
      const viewerMatch = this.transformMatch(m, 1, 3, matchNumber++);
      matchIdMap.set(m.id, viewerMatch.id);
      reverseMatchIdMap.set(viewerMatch.id, m.id);
      matches.push(viewerMatch);
    });

    return matches;
  }

  /**
   * Transform single match
   */
  private static transformMatch(
    playoffMatch: PlayoffMatch,
    stageId: number,
    groupId: number,
    matchNumber: number
  ): ViewerMatch {
    const team1ParticipantId = playoffMatch.team1Id 
      ? this.teamIdMap.get(playoffMatch.team1Id) 
      : null;
    
    const team2ParticipantId = playoffMatch.team2Id 
      ? this.teamIdMap.get(playoffMatch.team2Id) 
      : null;

    return {
      id: matchNumber,
      stage_id: stageId,
      group_id: groupId,
      round_id: playoffMatch.round,
      number: matchNumber,
      opponent1: team1ParticipantId ? {
        id: team1ParticipantId,
        position: playoffMatch.team1Seed || undefined,
        result: playoffMatch.winnerId === playoffMatch.team1Id ? 'win' : 
                playoffMatch.loserId === playoffMatch.team1Id ? 'loss' : undefined,
        score: playoffMatch.team1GameWins ?? playoffMatch.team1Score ?? undefined
      } : null,
      opponent2: team2ParticipantId ? {
        id: team2ParticipantId,
        position: playoffMatch.team2Seed || undefined,
        result: playoffMatch.winnerId === playoffMatch.team2Id ? 'win' : 
                playoffMatch.loserId === playoffMatch.team2Id ? 'loss' : undefined,
        score: playoffMatch.team2GameWins ?? playoffMatch.team2Score ?? undefined
      } : null,
      status: playoffMatch.status === 'completed' ? 'completed' : 
              (team1ParticipantId && team2ParticipantId) ? 'ready' : 'waiting'
    };
  }

  /**
   * Transform playoff_games → viewer match games
   */
  private static transformGames(
    playoffMatches: PlayoffMatch[],
    matchIdMap: Map<string, number>
  ): ViewerMatchGame[] {
    const games: ViewerMatchGame[] = [];
    let gameId = 1;

    playoffMatches.forEach((match) => {
      const viewerMatchId = matchIdMap.get(match.id);
      if (!viewerMatchId) return;

      const team1ParticipantId = match.team1Id ? this.teamIdMap.get(match.team1Id) : undefined;
      const team2ParticipantId = match.team2Id ? this.teamIdMap.get(match.team2Id) : undefined;

      if (match.games && match.games.length > 0) {
        match.games.forEach((game, gameNumber) => {
          games.push({
            id: gameId++,
            number: gameNumber + 1,
            stage_id: 1,
            parent_id: viewerMatchId,
            status: game.winnerId ? 'completed' : 'ready',
            opponent1: {
              id: team1ParticipantId,
              score: game.team1Score ?? undefined,
              result: game.winnerId === match.team1Id ? 'win' : 
                      game.winnerId ? 'loss' : undefined
            },
            opponent2: {
              id: team2ParticipantId,
              score: game.team2Score ?? undefined,
              result: game.winnerId === match.team2Id ? 'win' : 
                      game.winnerId ? 'loss' : undefined
            }
          });
        });
      }
    });

    return games;
  }

  /**
   * Helper: Calculate bracket size (power of 2)
   */
  private static calculateBracketSize(matches: PlayoffMatch[]): number {
    if (matches.length === 0) return 8;
    
    const seeds = matches
      .flatMap(m => [m.team1Seed, m.team2Seed])
      .filter((seed): seed is number => seed !== null && seed !== undefined);
    
    if (seeds.length === 0) return 8;
    
    const maxSeed = Math.max(...seeds);
    return Math.pow(2, Math.ceil(Math.log2(maxSeed || 8)));
  }

}
