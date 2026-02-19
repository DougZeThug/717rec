import { useMemo } from 'react';

import { useTeamsQuery } from '@/hooks/teams';
import { isUUID, toTeamSlug } from '@/utils/teamSlug';

/**
 * Resolves a URL parameter (either a UUID or a slug) to a team UUID.
 * If the param is a UUID, it passes through immediately.
 * If it's a slug, it matches against cached team names.
 */
export function useResolveTeamSlug(param: string | undefined): {
  teamId: string | undefined;
  isResolving: boolean;
} {
  const isSlug = param ? !isUUID(param) : false;

  // Only fetch teams list when we need to resolve a slug
  const { data: teams, isLoading } = useTeamsQuery({
    includeHidden: true,
    enabled: isSlug,
  });

  const teamId = useMemo(() => {
    if (!param) return undefined;

    // UUID — pass through directly
    if (!isSlug) return param;

    // Slug — find matching team
    if (!teams) return undefined;
    const match = teams.find((t) => toTeamSlug(t.name) === param);
    return match?.id;
  }, [param, isSlug, teams]);

  return {
    teamId,
    isResolving: isSlug && isLoading,
  };
}
