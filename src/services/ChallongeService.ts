
import { supabase } from "@/integrations/supabase/client";
import { ChallongeTournament, ChallongeParticipant, ChallongeMatch } from "@/services/challonge/types";
import { Team } from "@/types";

interface CreateTournamentParams {
  name: string;
  tournamentType: "single elimination" | "double elimination";
  description?: string;
}

interface AddParticipantParams {
  tournamentId: string;
  name: string;
  seed?: number;
  miscInfo?: string;
}

interface UpdateMatchParams {
  tournamentId: string;
  matchId: string;
  scoresCsv: string;
  winnerId: string;
  loserId?: string;
}

export class ChallongeService {
  /**
   * Creates a new tournament in Challonge
   */
  static async createTournament(params: CreateTournamentParams): Promise<ChallongeTournament> {
    const { name, tournamentType, description } = params;
    
    const tournamentData = {
      name,
      tournament_type: tournamentType,
      description,
    };
    
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "createTournament",
        tournamentData,
      }
    });
    
    if (error) throw error;
    return data.tournament;
  }
  
  /**
   * Adds a participant (team) to a Challonge tournament
   */
  static async addParticipant(params: AddParticipantParams): Promise<ChallongeParticipant> {
    const { tournamentId, name, seed, miscInfo } = params;
    
    const participantData = {
      name,
      seed,
      misc: miscInfo,
    };
    
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "addParticipant",
        tournamentId,
        participantData,
      }
    });
    
    if (error) throw error;
    return data.participant;
  }
  
  /**
   * Bulk adds participants (teams) to a Challonge tournament
   */
  static async addTeamsToTournament(tournamentId: string, teams: Team[]): Promise<ChallongeParticipant[]> {
    const participants: ChallongeParticipant[] = [];
    
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      const participant = await this.addParticipant({
        tournamentId,
        name: team.name,
        seed: team.seed || i + 1,
        miscInfo: team.id, // Store the team ID in Challonge for reference
      });
      participants.push(participant);
    }
    
    return participants;
  }
  
  /**
   * Gets tournament details including participants and matches
   */
  static async getTournament(tournamentId: string): Promise<ChallongeTournament> {
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "getTournament",
        tournamentId,
      }
    });
    
    if (error) throw error;
    return data.tournament;
  }
  
  /**
   * Gets matches for a tournament
   */
  static async getMatches(tournamentId: string): Promise<ChallongeMatch[]> {
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "getMatches",
        tournamentId,
      }
    });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Updates a match with scores
   */
  static async updateMatch(params: UpdateMatchParams): Promise<ChallongeMatch> {
    const { tournamentId, matchId, scoresCsv, winnerId, loserId } = params;
    
    const scoreData = {
      scores_csv: scoresCsv,
      winner_id: winnerId,
      loser_id: loserId,
    };
    
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "updateMatch",
        tournamentId,
        matchId,
        scoreData,
      }
    });
    
    if (error) throw error;
    return data.match;
  }
  
  /**
   * Starts a tournament (must have at least 2 participants)
   */
  static async startTournament(tournamentId: string): Promise<ChallongeTournament> {
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "startTournament",
        tournamentId,
      }
    });
    
    if (error) throw error;
    return data.tournament;
  }
  
  /**
   * Finalizes a tournament
   */
  static async finalizeTournament(tournamentId: string): Promise<ChallongeTournament> {
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "finalizeTournament",
        tournamentId,
      }
    });
    
    if (error) throw error;
    return data.tournament;
  }
}
