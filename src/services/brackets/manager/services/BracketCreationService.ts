import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog, failureLog, successLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type { CreateBracketOptions, ErrorLike } from '../types/BracketServiceTypes';
import { isErrorLike, serializeError } from '../utils/BracketErrorUtils';

/**
 * Service responsible for bracket creation
 * Handles participant insertion and stage creation
 */
export class BracketCreationService {
  constructor(
    private storage: SupabaseSqlStorage,
    private manager: BracketsManager
  ) {}

  /**
   * Create a new bracket using brackets-manager with SQL storage
   */
  async createBracket(options: CreateBracketOptions): Promise<void> {
    const { bracketId, format, teams } = options;

    bracketLog('🚀 STARTING bracket creation with SQL storage:', {
      bracketId,
      format,
      teamCount: teams.length,
    });

    try {
      // Step 1: Calculate required bracket size (next power of 2 for brackets-manager)
      // brackets-manager requires bracket size >= team count for BYEs to work
      let bracketSize = 2;
      while (bracketSize < teams.length) {
        bracketSize *= 2;
      }
      const byesNeeded = bracketSize - teams.length;

      bracketLog('📊 Bracket sizing (with BYE support):', {
        teamCount: teams.length,
        bracketSize,
        byesNeeded,
        note:
          byesNeeded > 0
            ? `Top ${byesNeeded} seeds get BYEs (auto-advance to round 2), bottom ${teams.length - byesNeeded} seeds play in round 1`
            : 'No BYEs needed',
      });

      // Step 2: Sort teams by seed
      bracketLog('📝 Step 2/5: Sorting teams by seed...');
      const teamsBySeed = [...teams].sort((a, b) => a.seed - b.seed);
      bracketLog('✅ Teams sorted:', {
        teams: teamsBySeed.map((t) => `${t.name} (seed ${t.seed})`),
      });

      // Step 3: Create seeding array in simple seed order
      // brackets-manager will apply seedOrdering: 'inner_outer' to create proper matchups
      bracketLog('📝 Step 3/5: Creating seeding array in seed order...');

      // Pass teams in seed order [seed1, seed2, ..., null, null]
      // brackets-manager's seedOrdering handles the bracket positioning
      const seeding: (string | null)[] = teamsBySeed
        .map((t) => t.name)
        .concat(Array(byesNeeded).fill(null));

      bracketLog('✅ Seeding array created:', {
        length: seeding.length,
        teams: seeding.filter((s) => s !== null).length,
        byes: seeding.filter((s) => s === null).length,
        order: seeding.map((name, idx) => `Seed ${idx + 1}: ${name || 'BYE'}`),
      });

      // Step 4: Prepare participant inserts (including BYEs)
      bracketLog('📝 Step 4/5: Preparing participant inserts...');
      const participantInserts = seeding.map((name, index) => {
        return {
          tournament_id: bracketId,
          name: name, // null for BYEs
          position: index + 1, // Use bracket position (1-based), not team seed
        };
      });
      bracketLog('✅ Participant inserts prepared:', {
        count: participantInserts.length,
        teams: participantInserts.filter((p) => p.name !== null).length,
        byes: participantInserts.filter((p) => p.name === null).length,
      });

      // Step 5: Insert participants into database
      bracketLog('📝 Step 5/5: Inserting participants into database...');
      const { data: insertedParticipants, error: participantsError } = await supabase
        .from('participant' as any)
        .insert(participantInserts)
        .select('*');

      if (participantsError) {
        const errLike = participantsError as ErrorLike;
        errorLog('Participant insertion failed - FULL ERROR:', {
          error: participantsError,
          errorType: participantsError?.constructor?.name,
          code: participantsError.code,
          message: participantsError.message,
          details: participantsError.details,
          hint: participantsError.hint,
          statusCode: errLike.statusCode,
          inserts: participantInserts,
          serialized: serializeError(participantsError),
        });
        throw new Error(`Failed to insert participants: ${serializeError(participantsError)}`);
      }

      bracketLog('✅ Participants inserted successfully:', {
        insertedCount: insertedParticipants?.length || 0,
        participants: insertedParticipants,
      });

      // Load participants into cache before bracket operations
      bracketLog('📝 Loading participants into cache...');
      await (this.storage as SupabaseSqlStorage).loadParticipantsForTournament(bracketId);

      // Step 6: Create bracket stage with brackets-manager
      bracketLog('📝 Step 6/5: Creating bracket stage with brackets-manager...');

      const stageConfig = {
        name: bracketId,
        tournamentId: bracketId,
        type: format,
        seeding,
        settings: {
          // Fixed seedOrdering for double elimination:
          // [WB R1, LB minor R1 (reverse), LB major R1 (natural), LB minor R2 (reverse)]
          // Alternates between 'reverse' (losers intake) and 'natural' (LB progression)
          seedOrdering: ['inner_outer', 'natural', 'reverse_half_shift', 'reverse'] as any,
          grandFinal: (format === 'double_elimination'
            ? options.grandFinalType || 'simple'
            : 'none') as 'simple' | 'double' | 'none',
        },
      };

      bracketLog('🎯 Stage configuration:', stageConfig);

      await this.manager.create.stage(stageConfig);

      bracketLog('✅ Stage created successfully in SQL tables');

      // Load groups into cache for BYE vs TBD detection in subsequent operations
      // This is critical to prevent cascading auto-advancement in Losers Bracket
      const stages = await this.storage.select('stage', { tournament_id: bracketId } as any);
      const stagesArray = Array.isArray(stages) ? stages : stages ? [stages] : [];
      if (stagesArray.length > 0) {
        const stageId = (stagesArray[0] as any).id;
        await (this.storage as SupabaseSqlStorage).loadGroupsForStage(stageId);
        bracketLog('✅ Groups loaded into cache for stage:', stageId);
      }

      // Note: brackets-manager handles child_count and BYE propagation automatically
      // WB BYEs are handled at creation time. LB empty slots are TBD, not BYEs.

      successLog('Bracket created successfully', bracketId);
    } catch (error) {
      // Comprehensive error logging
      const errorDetails = {
        timestamp: new Date().toISOString(),
        bracketId,
        format,
        teamCount: teams.length,
        errorType: error?.constructor?.name || typeof error,
        errorString: String(error),
        errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
        serializedError: serializeError(error),
      };

      // Check if it's a Supabase error
      if (isErrorLike(error) && error.code) {
        Object.assign(errorDetails, {
          supabaseCode: error.code,
          supabaseMessage: error.message,
          supabaseDetails: error.details,
          supabaseHint: error.hint,
          supabaseStatusCode: error.statusCode,
        });
      }

      errorLog('BracketCreationService.createBracket FAILED - Full Debug Info:', errorDetails);

      failureLog('Failed to create bracket', serializeError(error));

      throw new Error(`Bracket creation failed: ${serializeError(error)}`);
    }
  }
}
