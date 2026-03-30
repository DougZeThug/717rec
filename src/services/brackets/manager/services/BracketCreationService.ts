import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
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
      // brackets-manager will apply seedOrdering: 'inner_outer' to create proper matchups
      bracketLog('📝 Step 3/5: Creating seeding array in seed order...');

      const seeding: (string | null)[] = teamsBySeed
        .map((t) => t.name)
        .concat(Array(byesNeeded).fill(null));

      bracketLog('✅ Seeding array created:', {
        length: seeding.length,
        teams: seeding.filter((s) => s !== null).length,
        byes: seeding.filter((s) => s === null).length,
        order: seeding.map((name, idx) => `Seed ${idx + 1}: ${name || 'BYE'}`),
      });

      // Step 4: Create bracket stage with brackets-manager
      // Let the library create participant rows — we sync team_id afterward
      bracketLog('📝 Step 4/5: Creating bracket stage with brackets-manager...');

      // Dynamic LB seed orderings based on bracket size (per brackets-manager docs)
      const lbOrderings: Record<number, string[]> = {
        4:  ['natural', 'reverse'],
        8:  ['natural', 'reverse', 'natural'],
        16: ['natural', 'reverse_half_shift', 'reverse', 'natural'],
      };
      const seedOrdering = ['inner_outer', ...(lbOrderings[bracketSize] || lbOrderings[16])];

      const stageConfig = {
        name: bracketId,
        tournamentId: bracketId,
        type: format,
        seeding,
        settings: {
          seedOrdering: seedOrdering as any,
          grandFinal: (format === 'double_elimination'
            ? options.grandFinalType || 'simple'
            : 'none') as 'simple' | 'double' | 'none',
        },
      };

      bracketLog('🎯 Stage configuration:', stageConfig);

      await this.manager.create.stage(stageConfig);

      bracketLog('✅ Stage created successfully in SQL tables');

      // Step 5: Post-creation sync — link participants to teams
      // brackets-manager created participants with names but no team_id/position.
      // Mirror the pattern from BracketSeedingService to synchronize these fields.
      bracketLog('📝 Step 5/5: Syncing team_id and position onto participants...');

      const participants = await this.storage.select('participant', {
        tournament_id: bracketId,
      });

      if (participants) {
        const participantArray = (
          Array.isArray(participants) ? participants : [participants]
        ) as StorageParticipant[];

        for (const participant of participantArray) {
      if (participant.name === null) {
            const { error: byeError } = await supabase
              .from('participant')
              .update({ position: null, team_id: null })
              .eq('id', participant.id);
            if (byeError) handleDatabaseError(byeError, 'Failed to sync BYE participant');
          } else {
            const team = teamsBySeed.find((t) => t.name === participant.name);
            if (team) {
              const slotPosition = teamsBySeed.indexOf(team) + 1;
              const { error: teamError } = await supabase
                .from('participant')
                .update({ position: slotPosition, team_id: team.id })
                .eq('id', participant.id);
              if (teamError) handleDatabaseError(teamError, 'Failed to sync participant to team');
            }
          }
        }

        bracketLog('✅ Participant sync complete:', {
          total: participantArray.length,
          linked: participantArray.filter((p) => p.name !== null).length,
          byes: participantArray.filter((p) => p.name === null).length,
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

      throw new Error(`Bracket creation failed: ${serializeError(error)}`, { cause: error });
    }
  }
}
