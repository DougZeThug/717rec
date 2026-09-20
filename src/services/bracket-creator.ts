import { supabase } from '@/integrations/supabase/client';
import { bracketManagerService } from '@/services/brackets/manager';
import type { BracketRecord } from '@/types/bracketRecord';
import { BusinessLogicError } from '@/types/errors';
import { getTierFromDivision } from '@/utils/autoSchedule/blossom/tierUtils';
import { bracketLog, errorLog, failureLog, successLog, warnLog } from '@/utils/logger';
import { getDisplayedPowerScore } from '@/utils/powerScore/formatPowerScore';

export interface BracketCreationOptions {
  name: string;
  format: 'singleElim' | 'doubleElim';
  divisionId: string;
  teams: { id: string; name: string; seed?: number }[];
  onProgress?: (step: string) => void;
  grandFinalType?: 'simple' | 'double';
  seasonId?: string | null;
}

export async function createBracket(options: BracketCreationOptions): Promise<BracketRecord> {
  const { name, format, divisionId, teams, onProgress, grandFinalType, seasonId } = options;

  bracketLog('Starting bracket creation:', { name, format, teamCount: teams.length });

  let createdBracketId: string | null = null;

  try {
    onProgress?.('Creating tournament and saving to database...');

    // Fetch complete team data with power scores for proper seeding
    const { data: fullTeamData, error: teamError } = await supabase
      .from('v_team_details')
      .select('team_id, name, power_score, win_percentage, divisionname')
      .in(
        'team_id',
        teams.map((t) => t.id)
      );

    if (teamError) {
      warnLog('Failed to fetch team details for seeding, using provided order:', teamError);
    }

    // Seeds an admin picked by hand are already spoken for. Auto-assignment used
    // to number the sorted positions 1..N, so it handed an unseeded team a
    // number a manual pick was already holding: two teams on one seed, and one
    // seed never issued. brackets-manager seeds by array position, so the tie
    // was broken by input order and the manually-seeded team quietly moved.
    const claimedSeeds = new Set(
      teams
        .map((team) => team.seed)
        .filter((seed): seed is number => typeof seed === 'number' && seed > 0)
    );
    let nextAutoSeed = 1;

    // Sort teams by ranking (same logic as useTeamRankings) and assign seeds
    const sortedTeams = teams
      .map((team) => {
        const fullData = fullTeamData?.find((ft) => ft.team_id === team.id);
        return {
          ...team,
          seed: team.seed || null, // Preserve manual seed if provided
          // `??`, not `||`, exactly as useTeamRankings does: a real power
          // score of 0 is a score, and `||` turned it into "no score" and sank
          // that team to the bottom of the bracket.
          power_score: fullData?.power_score ?? null,
          winPercentage: fullData?.win_percentage || 0,
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

        // The stored column, not a local `wins / (wins + losses)`. The view
        // divides by every completed match, so a match that completed without a
        // winner counts in its denominator and not in `wins` or `losses`. The
        // local sum silently dropped those, which made this tiebreaker disagree
        // with the standings the admin is looking at — and with the projected
        // seeds, which take the standings order as given and promise it matches
        // what this function assigns.
        const aWinPct = a.winPercentage;
        const bWinPct = b.winPercentage;
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
      .map((team) => {
        // A manual seed is kept exactly as typed. Everyone else takes the
        // lowest seed nobody claimed, in the sorted order above.
        let finalSeed: number;
        if (team.seed) {
          finalSeed = team.seed;
        } else {
          while (claimedSeeds.has(nextAutoSeed)) nextAutoSeed += 1;
          finalSeed = nextAutoSeed;
          nextAutoSeed += 1;
        }

        return {
          id: team.id,
          name: team.name,
          seed: finalSeed,
        };
      })
      // Right numbers, wrong order: the sort above puts every manual seed
      // first, so an auto-seeded 1 sits behind a manual 2. BracketCreationService
      // re-sorts by seed anyway, so this cannot change the bracket — it makes
      // the `participants` list this function returns agree with what is built.
      .sort((a, b) => a.seed - b.seed);

    onProgress?.('Creating bracket record...');

    // Create bracket record in database. grandFinalType is NOT stored here:
    // brackets-manager persists it in stage.settings.grandFinal at stage
    // creation, and the viewer reads it from there. (Older rows carry a
    // legacy copy in the brackets.participants JSONB — see MatchTransformer.)
    const { data: bracketData, error: bracketError } = await supabase
      .from('brackets')
      .insert({
        title: name,
        division_id: divisionId,
        format: format === 'singleElim' ? 'Single Elimination' : 'Double Elimination',
        state: 'pending',
        uses_brackets_manager: true,
        season_id: seasonId || null,
      })
      .select()
      .single();

    if (bracketError) throw bracketError;

    createdBracketId = bracketData.id;

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

    failureLog('Bracket creation failed', error);

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
