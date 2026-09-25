import { useQuery } from '@tanstack/react-query';

import { bracketManagerService } from '@/services/brackets/manager';
import type { EditMatchTeamsParams } from '@/services/brackets/manager/services/BracketAdmin/editTeams/types';

/** Whether Edit teams can change this match, and if not, why not. Drives the button. */
export const useEditTeamsEligibility = (matchId: number | null) =>
  useQuery({
    queryKey: ['edit-teams-eligibility', matchId],
    queryFn: () => bracketManagerService.checkEditTeamsEligibility(matchId as number),
    enabled: matchId !== null,
  });

/**
 * The Edit teams screen's data: the two sides, the grouped team list, and the
 * concurrency token. The screen works against it as a stable copy — never
 * refetched while open, never served from cache on reopen (the body that uses
 * it mounts only while the screen is open).
 */
export const useEditTeamsOptions = (matchId: number | null) =>
  useQuery({
    queryKey: ['edit-teams-options', matchId],
    queryFn: () => bracketManagerService.getEditTeamsOptions(matchId as number),
    enabled: matchId !== null,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

/** What saving these picks would do. Idle until there are picks to review. */
export const useEditTeamsPreview = (params: EditMatchTeamsParams | null) =>
  useQuery({
    queryKey: ['edit-teams-preview', params],
    queryFn: () => bracketManagerService.previewEditMatchTeams(params as EditMatchTeamsParams),
    enabled: params !== null,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
