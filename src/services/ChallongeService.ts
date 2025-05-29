
import { supabase } from "@/integrations/supabase/client";
import { ChallongeTournament, ChallongeParticipant, ChallongeMatch } from "@/services/challonge/types";
import { Team } from "@/types";
import { slugify } from "@/utils/slugify";

interface CreateTournamentParams {
  name: string;
  tournamentType: "single elimination" | "double elimination";
  description?: string;
}

interface AddParticipantParams {
  tournamentId: string;
  name: string;
  seed: number;
  misc: string;
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
    
    // Create a unique, safe URL slug
    const safeSlug = slugify(name);
    const uniqueSlug = `${safeSlug}_${Date.now()}`;
    
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "createTournament",
        args: {
          name,
          url: uniqueSlug,
          tournament_type: tournamentType,
          description,
        }
      }
    });
    
    if (error) throw new Error(error.message || 'Challonge create failed');
    return data.tournament;
  }
  
  /**
   * Adds a participant (team) to a Challonge tournament
   */
  static async addParticipant(params: AddParticipantParams): Promise<ChallongeParticipant> {
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "addParticipant",
        args: params
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
        seed: i + 1,
        misc: team.id, // Store the team ID in Challonge for reference
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
        args: {
          tournamentId,
        }
      }
    });
    
    if (error) throw error;
    // Challonge returns [{ match: { … } }] - unwrap the match objects
    return (data as any[]).map((m) => m.match);
  }
  
  /**
   * Gets participants for a tournament
   */
  static async getParticipants(tournamentId: string): Promise<ChallongeParticipant[]> {
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "getParticipants",
        args: {
          tournamentId,
        }
      }
    });
    
    if (error) throw error;
    // Challonge returns [{ participant: { … } }] - unwrap the participant objects
    return (data as any[]).map((p) => p.participant);
  }
  
  /**
   * Updates a match with scores
   */
  static async updateMatch(params: UpdateMatchParams): Promise<ChallongeMatch> {
    const { tournamentId, matchId, scoresCsv, winnerId, loserId } = params;
    
    const { data, error } = await supabase.functions.invoke("challonge", {
      body: {
        action: "updateMatch",
        args: {
          tournamentId,
          matchId,
          scoreData: {
            scores_csv: scoresCsv,
            winner_id: winnerId,
            loser_id: loserId,
          }
        }
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
        args: {
          tournamentId,
        }
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
        args: {
          tournamentId,
        }
      }
    });
    
    if (error) throw error;
    return data.tournament;
  }
}
