import { useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useTeamMatches } from '@/hooks/useTeamMatches';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import { Match } from '@/types';

interface TeamInfo {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface MatchWithOpponent {
  match: Match;
  opponent: TeamInfo;
  weekNumber: number | null;
}

interface MyNextMatchResult {
  matches: MatchWithOpponent[];
  myTeam: TeamInfo | null;
  isLoading: boolean;
  hasTeamMembership: boolean;
  isPreviousMatches: boolean;
}

/**
 * Helper to get the date string (YYYY-MM-DD) from a match date
 */
const getMatchDateKey = (match: Match): string | null => {
  if (!match.date) return null;
  return match.date.split('T')[0];
};

/**
 * Hook to get the logged-in user's upcoming or recent matches
 * Returns all matches on the same date (to show multiple Thursday games)
 * Falls back to previous matches if no upcoming ones exist
 */
export const useMyNextMatch = (): MyNextMatchResult => {
  const { user } = useAuth();
  const { membership, isLoading: membershipLoading } = useTeamMembership();

  // Use lightweight team-specific hook instead of loading all matches
  const myTeamId = membership?.team_id;
  const {
    upcomingMatches,
    pastMatches: completedMatches,
    isLoadingMatches: matchesLoading,
  } = useTeamMatches(myTeamId);

  const result = useMemo(() => {
    // No user or still loading
    if (!user || membershipLoading || matchesLoading) {
      return {
        matches: [],
        myTeam: null,
        hasTeamMembership: false,
        isPreviousMatches: false,
      };
    }

    // User is not on a team or not approved
    if (!membership?.team_id || !membership?.is_approved) {
      return {
        matches: [],
        myTeam: null,
        hasTeamMembership: false,
        isPreviousMatches: false,
      };
    }

    const myTeamName = membership.team?.name || 'My Team';
    // Use logoUrl first, fall back to imageUrl
    const myTeamLogo = membership.team?.logoUrl || membership.team?.imageUrl || null;

    const myTeam: TeamInfo = {
      id: myTeamId!,
      name: myTeamName,
      logoUrl: myTeamLogo,
    };

    // Helper to build match info with opponent details
    const buildMatchInfo = (match: Match): MatchWithOpponent => {
      const isTeam1 = match.team1Id === myTeamId;
      const opponentDetails = isTeam1 ? match.team2Details : match.team1Details;
      const opponentId = isTeam1 ? match.team2Id : match.team1Id;

      const opponent: TeamInfo = {
        id: opponentId,
        name: opponentDetails?.name || 'TBD',
        logoUrl: opponentDetails?.image_url || opponentDetails?.logo_url || null,
      };

      return {
        match,
        opponent,
        weekNumber: match.round_number || null,
      };
    };

    // Filter out postponed/canceled matches (useTeamMatches already filtered by team)
    const validUpcomingMatches = upcomingMatches.filter((match) => {
      return match.status !== 'postponed' && match.status !== 'canceled';
    });

    // If there are upcoming matches, get all on the earliest date
    if (validUpcomingMatches.length > 0) {
      const earliestDateKey = getMatchDateKey(validUpcomingMatches[0]);

      // Get all matches on that same date
      const matchesOnEarliestDate = validUpcomingMatches.filter(
        (match) => getMatchDateKey(match) === earliestDateKey
      );

      return {
        matches: matchesOnEarliestDate.map(buildMatchInfo),
        myTeam,
        hasTeamMembership: true,
        isPreviousMatches: false,
      };
    }

    // No upcoming matches - fall back to most recent completed matches
    // completedMatches from useTeamMatches are already filtered by team and sorted
    if (completedMatches.length > 0) {
      const mostRecentDateKey = getMatchDateKey(completedMatches[0]);

      // Get all matches on that same date
      const matchesOnMostRecentDate = completedMatches.filter(
        (match) => getMatchDateKey(match) === mostRecentDateKey
      );

      return {
        matches: matchesOnMostRecentDate.map(buildMatchInfo),
        myTeam,
        hasTeamMembership: true,
        isPreviousMatches: true,
      };
    }

    // No matches at all
    return {
      matches: [],
      myTeam,
      hasTeamMembership: true,
      isPreviousMatches: false,
    };
  }, [user, membership, membershipLoading, matchesLoading, upcomingMatches, completedMatches, myTeamId]);

  return {
    ...result,
    isLoading: !user ? false : membershipLoading || matchesLoading,
  };
};
