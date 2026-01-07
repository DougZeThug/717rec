import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { errorLog, warnLog } from "@/utils/logger";

interface OpponentRecord {
  opponentId: string;
  opponentName: string;
  opponentDivision: string | null;
  matchCount: number;
  wins: number;
  losses: number;
}

interface TeamOpponentHistory {
  teamId: string;
  teamName: string;
  divisionId: string | null;
  divisionName: string | null;
  opponents: OpponentRecord[];
  uniqueOpponentCount: number;
  totalMatches: number;
}

export interface SeasonOpponentData {
  seasonId: string;
  seasonName: string;
  teams: TeamOpponentHistory[];
}

export const useSeasonOpponentHistory = () => {
  return useQuery({
    queryKey: ["season-opponent-history"],
    queryFn: async (): Promise<SeasonOpponentData | null> => {
      // 1. Get active season
      const { data: activeSeason, error: seasonError } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("is_active", true)
        .single();

      if (seasonError || !activeSeason) {
        warnLog("No active season found:", seasonError);
        return null;
      }

      // 2. Get all regular season matches for active season (exclude playoff matches)
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select(`
          id,
          team1_id,
          team2_id,
          winner_id,
          iscompleted
        `)
        .eq("season_id", activeSeason.id)
        .eq("iscompleted", true)
        .is("bracket_id", null); // Regular season only - no bracket/playoff matches

      if (matchesError) {
        errorLog("Error fetching matches:", matchesError);
        throw matchesError;
      }

      // 3. Get all teams with divisions
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          division_id,
          divisions (
            id,
            name
          )
        `);

      if (teamsError) {
        errorLog("Error fetching teams:", teamsError);
        throw teamsError;
      }

      // Build team lookup map
      const teamMap = new Map<string, { name: string; divisionId: string | null; divisionName: string | null }>();
      teams?.forEach((team) => {
        teamMap.set(team.id, {
          name: team.name,
          divisionId: team.division_id,
          divisionName: team.divisions?.name || null,
        });
      });

      // 4. Process matches to build opponent history per team
      const teamOpponents = new Map<string, Map<string, { wins: number; losses: number }>>();

      matches?.forEach((match) => {
        const { team1_id, team2_id, winner_id } = match;
        if (!team1_id || !team2_id) return;

        // Initialize team maps if not exists
        if (!teamOpponents.has(team1_id)) {
          teamOpponents.set(team1_id, new Map());
        }
        if (!teamOpponents.has(team2_id)) {
          teamOpponents.set(team2_id, new Map());
        }

        const team1Opponents = teamOpponents.get(team1_id)!;
        const team2Opponents = teamOpponents.get(team2_id)!;

        // Get or initialize opponent records
        const team1Record = team1Opponents.get(team2_id) || { wins: 0, losses: 0 };
        const team2Record = team2Opponents.get(team1_id) || { wins: 0, losses: 0 };

        // Update win/loss based on winner
        if (winner_id === team1_id) {
          team1Record.wins++;
          team2Record.losses++;
        } else if (winner_id === team2_id) {
          team1Record.losses++;
          team2Record.wins++;
        }

        team1Opponents.set(team2_id, team1Record);
        team2Opponents.set(team1_id, team2Record);
      });

      // 5. Build final data structure
      const teamsWithOpponents: TeamOpponentHistory[] = [];

      teamOpponents.forEach((opponents, teamId) => {
        const teamInfo = teamMap.get(teamId);
        if (!teamInfo) return;

        const opponentRecords: OpponentRecord[] = [];
        let totalMatches = 0;

        opponents.forEach((record, opponentId) => {
          const opponentInfo = teamMap.get(opponentId);
          const matchCount = record.wins + record.losses;
          totalMatches += matchCount;

          opponentRecords.push({
            opponentId,
            opponentName: opponentInfo?.name || "Unknown",
            opponentDivision: opponentInfo?.divisionName || null,
            matchCount,
            wins: record.wins,
            losses: record.losses,
          });
        });

        // Sort opponents by match count desc, then name
        opponentRecords.sort((a, b) => {
          if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
          return a.opponentName.localeCompare(b.opponentName);
        });

        teamsWithOpponents.push({
          teamId,
          teamName: teamInfo.name,
          divisionId: teamInfo.divisionId,
          divisionName: teamInfo.divisionName,
          opponents: opponentRecords,
          uniqueOpponentCount: opponentRecords.length,
          totalMatches: totalMatches / 2, // Each match counted twice (once per team)
        });
      });

      // Sort teams by division, then name
      teamsWithOpponents.sort((a, b) => {
        if (a.divisionName !== b.divisionName) {
          return (a.divisionName || "").localeCompare(b.divisionName || "");
        }
        return a.teamName.localeCompare(b.teamName);
      });

      return {
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        teams: teamsWithOpponents,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - opponent history only changes when new matches are added
  });
};
