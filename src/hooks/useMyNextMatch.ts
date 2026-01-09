import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMembership } from "@/hooks/useTeamMembership";
import { useScheduleData } from "@/hooks/useScheduleData";
import { Match } from "@/types";

interface TeamInfo {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface MyNextMatchResult {
  nextMatch: Match | null;
  myTeam: TeamInfo | null;
  opponent: TeamInfo | null;
  isLoading: boolean;
  hasTeamMembership: boolean;
  weekNumber: number | null;
}

/**
 * Hook to get the logged-in user's next scheduled match
 * Returns null if user is not authenticated or not on a team
 */
export const useMyNextMatch = (): MyNextMatchResult => {
  const { user } = useAuth();
  const { membership, isLoading: membershipLoading } = useTeamMembership();
  const { upcomingMatches, matchesLoading } = useScheduleData();

  const result = useMemo(() => {
    // No user or still loading
    if (!user || membershipLoading || matchesLoading) {
      return {
        nextMatch: null,
        myTeam: null,
        opponent: null,
        hasTeamMembership: false,
        weekNumber: null,
      };
    }

    // User is not on a team or not approved
    if (!membership?.team_id || !membership?.is_approved) {
      return {
        nextMatch: null,
        myTeam: null,
        opponent: null,
        hasTeamMembership: false,
        weekNumber: null,
      };
    }

    const myTeamId = membership.team_id;
    const myTeamName = membership.team?.name || "My Team";
    const myTeamLogo = membership.team?.logoUrl || null;

    // Find the first upcoming match that involves the user's team
    // Filter out postponed/canceled matches
    const nextMatch = upcomingMatches.find((match) => {
      if (match.status === "postponed" || match.status === "canceled") {
        return false;
      }
      return match.team1Id === myTeamId || match.team2Id === myTeamId;
    });

    if (!nextMatch) {
      return {
        nextMatch: null,
        myTeam: { id: myTeamId, name: myTeamName, logoUrl: myTeamLogo },
        opponent: null,
        hasTeamMembership: true,
        weekNumber: null,
      };
    }

    // Determine which team is mine and which is opponent
    const isTeam1 = nextMatch.team1Id === myTeamId;
    
    const myTeam: TeamInfo = {
      id: myTeamId,
      name: myTeamName,
      logoUrl: myTeamLogo,
    };

    const opponentDetails = isTeam1 ? nextMatch.team2Details : nextMatch.team1Details;
    const opponentId = isTeam1 ? nextMatch.team2Id : nextMatch.team1Id;

    const opponent: TeamInfo = {
      id: opponentId,
      name: opponentDetails?.name || "TBD",
      logoUrl: opponentDetails?.logo_url || opponentDetails?.image_url || null,
    };

    // Calculate week number from match date
    let weekNumber: number | null = null;
    if (nextMatch.round_number) {
      weekNumber = nextMatch.round_number;
    }

    return {
      nextMatch,
      myTeam,
      opponent,
      hasTeamMembership: true,
      weekNumber,
    };
  }, [user, membership, membershipLoading, matchesLoading, upcomingMatches]);

  return {
    ...result,
    isLoading: !user ? false : membershipLoading || matchesLoading,
  };
};
