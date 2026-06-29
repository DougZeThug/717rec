import { supabase } from '@/integrations/supabase/client';
import { bracketManagerService } from '@/services/brackets/manager';
import type { BracketRecord } from '@/types/bracketRecord';
import { BusinessLogicError } from '@/types/errors';
import { getTierFromDivision } from '@/utils/autoSchedule/blossom/tierUtils';
import { bracketLog, errorLog, failureLog, successLog, warnLog } from '@/utils/logger';

export interface BracketCreationOptions {
  name: string;
  format: 'singleElim' | 'doubleElim';
  divisionId: string;
  teams: { id: string; name: string; seed?: number }[];
  onProgress?: (step: string) => void;
  grandFinalType?: 'simple' | 'double';
  seasonId?: string | null;
}

// Round to 1 decimal place to match the displayed power score the user sees in
// the standings UI. Sorting on the displayed value (instead of the raw value)
// keeps bracket seeding consistent with `useTeamRankings`.
const getDisplayedPowerScore = (powerScore: number | null | undefined): number | null => {
  if (powerScore === null || powerScore === undefined) return null;
  return Math.round(powerScore * 10) / 10;
};

export async function createBracket(options: BracketCreationOptions): Promise<BracketRecord> {
  const { name, format, divisionId, teams, onProgress, grandFinalType, seasonId } = options;

  bracketLog('Starting bracket creation:', { name, format, teamCount: teams.length });

  let createdBracketId: string | null = null;

  try {
    onProgress?.('Creating tournament and saving to database...');

    // Fetch complete team data with power scores for proper seeding
    const { data: fullTeamData, error: teamError } = await supabase
      .from('v_team_details')
      .select('team_id, name, power_score, wins, losses, divisionname')
      .in(
        'team_id',
        teams.map((t) => t.id)
      );

    if (teamError) {
      warnLog('Failed to fetch team details for seeding, using provided order:', teamError);
    }

    // Sort teams by ranking (same logic as useTeamRankings) and assign seeds
    const sortedTeams = teams
      .map((team) => {
        const fullData = fullTeamData?.find((ft) => ft.team_id === team.id);
        return {
          ...team,
          seed: team.seed || null, // Preserve manual seed if provided
          power_score: fullData?.power_score || null,
          wins: fullData?.wins || 0,
          losses: fullData?.losses || 0,
          divisionName: fullData?.divisionname || 'Unassigned',
        };
      })
      .sort((a, b) => {
        // If BOTH teams have manual seeds, sort by those seeds
        if (a.seed !== null && a.seed !== undefined && b.seed !== null && b.seed !== undefined) {
          return a.seed - b.seed;
        }

        // If only A has a manual seed, it goes first
        if (a.seed !== null && a.seed !== undefined) return -1;

        // If only B has a manual seed, it goes first
        if (b.seed !== null && b.seed !== undefined) return 1;

        // Neither has manual seed — mirror useTeamRankings exactly:
        //   1. Compare displayed (rounded) power scores; NULLs sink to the end.
        //   2. Division tier (higher division wins) — MUST come before win %.
        //   3. Win percentage desc.
        //   4. Team name asc.
        const aDisplayed = getDisplayedPowerScore(a.power_score);
        const bDisplayed = getDisplayedPowerScore(b.power_score);

        const aWinPct = a.wins && a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0;
        const bWinPct = b.wins && b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0;
        const tierA = getTierFromDivision(a.divisionName);
        const tierB = getTierFromDivision(b.divisionName);

        if (aDisplayed === null && bDisplayed === null) {
          if (tierA !== tierB) return tierA - tierB;
          if (aWinPct !== bWinPct) return bWinPct - aWinPct;
          return a.name.localeCompare(b.name);
        }
        if (aDisplayed === null) return 1;
        if (bDisplayed === null) return -1;

        if (aDisplayed !== bDisplayed) return bDisplayed - aDisplayed;
        if (tierA !== tierB) return tierA - tierB;
        if (aWinPct !== bWinPct) return bWinPct - aWinPct;
        return a.name.localeCompare(b.name);
      })
      .map((team, index) => {
        // Use manual seed if provided, otherwise auto-assign based on sorted position
        const finalSeed = team.seed || index + 1;

        return {
          id: team.id,
          name: team.name,
          seed: finalSeed,
        };
      });

    onProgress?.('Creating bracket record...');

    // Create bracket record in database
    const { data: bracketData, error: bracketError } = await supabase
      .from('brackets')
      .insert({
        title: name,
        division_id: divisionId,
        format: format === 'singleElim' ? 'Single Elimination' : 'Double Elimination',
        state: 'pending',
        uses_brackets_manager: true,
        season_id: seasonId || null,
        participants: {
          grandFinalType: grandFinalType || 'simple',
        },
      })
      .select()
      .single();

    if (bracketError) throw bracketError;

    createdBracketId = bracketData.id;

    onProgress?.('Storing participants...');

    // Insert participants into the participants table
    const participantInserts = sortedTeams.map((team) => ({
      bracket_id: bracketData.id,
      team_id: team.id,
      position: team.seed || 0,
    }));

    const { error: participantsError } = await supabase
      .from('participants')
      .insert(participantInserts);

    if (participantsError) {
      errorLog('Failed to insert participants:', participantsError);
      // Don't throw - bracket is already created, just log the error
    }

    onProgress?.('Generating matches with brackets-manager...');

    // Use brackets-manager to create matches
    await bracketManagerService.createBracket({
      bracketId: bracketData.id,
      format: format === 'singleElim' ? 'single_elimination' : 'double_elimination',
      teams: sortedTeams,
      grandFinalType: grandFinalType || 'simple',
    });

    const bracket: BracketRecord = {
      id: bracketData.id,
      challonge_tournament_id: 0, // Not used
      division_id: divisionId,
      title: name,
      format:
        bracketData.format ??
        (format === 'singleElim' ? 'single_elimination' : 'double_elimination'),
      state: 'pending',
      created_at: bracketData.created_at ?? new Date().toISOString(),
      uses_brackets_manager: true,
      participants: sortedTeams.map((t) => ({
        teamId: t.id,
        name: t.name,
        seed: t.seed,
      })),
    };

    onProgress?.('Complete!');
    successLog('Bracket created successfully', `ID: ${bracket.id}`);
    return bracket;
  } catch (error) {
    // Log full error details
    errorLog('Bracket creation error - full context:', {
      error,
      errorType: error?.constructor?.name,
      errorMessage: (error as { message?: unknown })?.message,
      isSupabaseError: error && typeof error === 'object' && 'code' in error,
      supabaseCode: (error as { code?: unknown })?.code,
      fullErrorString: JSON.stringify(error, null, 2),
    });

    failureLog('Bracket creation failed', error instanceof Error ? error : String(error));

    // Rollback: clean up orphaned bracket row if it was inserted
    if (createdBracketId) {
      const { error: cleanupError } = await supabase
        .from('brackets')
        .delete()
        .eq('id', createdBracketId);
      if (cleanupError) {
        errorLog('Failed to clean up orphaned bracket', {
          bracketId: createdBracketId,
          cleanupError,
        });
      } else {
        successLog('Cleaned up orphaned bracket', `ID: ${createdBracketId}`);
      }
    }

    // Preserve detailed error message if available
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : 'Unknown error';

    throw new BusinessLogicError(`Bracket creation failed: ${errorMessage}`, error);
  }
}
