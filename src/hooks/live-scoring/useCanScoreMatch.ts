import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useTeamMembership } from '@/hooks/useTeamMembership';

export interface CanScoreMatchInput {
  team1_id: string | null;
  team2_id: string | null;
  iscompleted: boolean | null;
}

/**
 * UI-side mirror of the user_can_score_match() database rule: admins can
 * score any open match, approved team members only their own team's open
 * matches. RLS is the real enforcement — this only gates what we render.
 */
export function useCanScoreMatch(match?: CanScoreMatchInput) {
  const { isAdminAccessGranted, isLoading: isAdminLoading } = useAdminAccess();
  const { membership, isFetching: isMembershipLoading } = useTeamMembership();

  const isMemberOfMatch = Boolean(
    match &&
    membership &&
    membership.is_approved === true &&
    (membership.team_id === match.team1_id || membership.team_id === match.team2_id)
  );

  const canScore = Boolean(
    match && match.iscompleted !== true && (isAdminAccessGranted || isMemberOfMatch)
  );

  return {
    canScore,
    isAdmin: isAdminAccessGranted,
    isMemberOfMatch,
    isLoading: isAdminLoading || isMembershipLoading,
  };
}
