import { BracketsManager } from 'brackets-manager';
import type { SeedOrdering } from 'brackets-model';

import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, errorLog, failureLog, successLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type { CreateBracketOptions, StorageParticipant } from '../types/BracketServiceTypes';
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
      // brackets-manager will apply seedOrdering: 'inner_outer' to create proper matchups.
      // Seeding entries are objects carrying team_id — the library spreads
      // extra fields onto the participant rows it inserts, so participants
      // are linked to teams by id from the start (no name matching).
      bracketLog('📝 Step 3/5: Creating seeding array in seed order...');

      const seeding: ({ name: string; team_id: string } | null)[] = teamsBySeed
        .map((t) => ({ name: t.name, team_id: t.id }))
        .concat(Array(byesNeeded).fill(null));

      bracketLog('✅ Seeding array created:', {
        length: seeding.length,
        teams: seeding.filter((s) => s !== null).length,
        byes: seeding.filter((s) => s === null).length,
        order: seeding.map((entry, idx) => `Seed ${idx + 1}: ${entry?.name || 'BYE'}`),
      });

      // Step 4: Create bracket stage with brackets-manager
      bracketLog('📝 Step 4/5: Creating bracket stage with brackets-manager...');

      // Dynamic LB seed orderings based on bracket size (per brackets-manager docs).
      // Single elimination REQUIRES exactly one ordering entry — the library
      // rejects the multi-entry list with "You must specify one seed ordering
      // method." (Passing the DE list for SE was a long-standing creation bug.)
      const lbOrderings: Record<number, string[]> = {
        4: ['natural', 'reverse'],
        8: ['natural', 'reverse', 'natural'],
        16: ['natural', 'reverse_half_shift', 'reverse', 'natural'],
      };
      const seedOrdering =
        format === 'single_elimination'
          ? ['inner_outer']
          : ['inner_outer', ...(lbOrderings[bracketSize] || lbOrderings[16])];

      const stageConfig: {
        name: string;
        tournamentId: string;
        type: typeof format;
        seeding: typeof seeding;
        settings: {
          seedOrdering: SeedOrdering[];
          grandFinal: 'simple' | 'double' | 'none';
        };
      } = {
        name: bracketId,
        tournamentId: bracketId,
        type: format,
        seeding,
        settings: {
          seedOrdering: seedOrdering as SeedOrdering[],
          grandFinal: (format === 'double_elimination'
            ? options.grandFinalType || 'simple'
            : 'none') as 'simple' | 'double' | 'none',
        },
      };

      bracketLog('🎯 Stage configuration:', stageConfig);

      await this.manager.create.stage(stageConfig);

      bracketLog('✅ Stage created successfully in SQL tables');

      // Step 5: Post-creation sync — write seed positions onto participants.
      // team_id was persisted by the library itself (carried on the seeding
      // objects); position is app-specific (1-based seed slot), resolved by
      // team_id — never by name.
      bracketLog('📝 Step 5/5: Syncing seed positions onto participants...');

      const participants = await this.storage.select('participant', {
        tournament_id: bracketId,
      });

      if (participants) {
        const participantArray = (
          Array.isArray(participants) ? participants : [participants]
        ) as StorageParticipant[];

        for (const participant of participantArray) {
          const seedIndex = teamsBySeed.findIndex((t) => t.id === participant.team_id);
          if (seedIndex === -1) continue;
          const { error: positionError } = await supabase
            .from('participant')
            .update({ position: seedIndex + 1 })
            .eq('id', participant.id);
          if (positionError) {
            handleDatabaseError(positionError, 'Failed to sync participant seed position');
          }
        }

        bracketLog('✅ Participant sync complete:', {
          total: participantArray.length,
          linked: participantArray.filter((p) => p.team_id != null).length,
        });
      }

      // Refresh cache with updated data
      this.storage.clearParticipantCache();
      await this.storage.loadParticipantsForTournament(bracketId);

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

      throw new BusinessLogicError(`Bracket creation failed: ${serializeError(error)}`, error);
    }
  }
}
