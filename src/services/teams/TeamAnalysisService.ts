import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

import { TeamAnalysis, TeamAnalysisInput } from './teamFetch.types';

// ─── fetchTeamAnalysis ────────────────────────────────────────────────────────

/**
 * Fetch analysis record for a team. Returns null if no analysis exists yet.
 */
export const fetchTeamAnalysis = async (teamId: string): Promise<TeamAnalysis | null> => {
  const { data, error } = await supabase
    .from('team_analysis')
    .select(
      'id, team_id, overall, strengths, weaknesses, trends, rivalry_insights, created_at, updated_at'
    )
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) handleDatabaseError(error, 'Failed to fetch team analysis');

  return data as TeamAnalysis | null;
};

// ─── upsertTeamAnalysis ───────────────────────────────────────────────────────

/**
 * Upsert (create or update) the analysis record for a team.
 */
export const upsertTeamAnalysis = async (
  teamId: string,
  input: TeamAnalysisInput,
  createdBy: string,
  updatedBy: string
) => {
  const { data, error } = await supabase
    .from('team_analysis')
    .upsert(
      {
        team_id: teamId,
        ...input,
        created_by: createdBy,
        updated_by: updatedBy,
      },
      {
        onConflict: 'team_id',
      }
    )
    .select()
    .single();

  if (error) handleDatabaseError(error, 'Failed to upsert team analysis');
  return data;
};
