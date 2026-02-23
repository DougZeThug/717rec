import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog, failureLog, successLog } from '@/utils/logger';
import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';

/**
 * Service for admin operations on brackets (BYE handling, match status control)
 */
export class BracketAdminService {
  constructor(private storage: SupabaseSqlStorage) {}

  /**
   * Check if a match is eligible for BYE status toggle (public wrapper)
   */
  async checkByeEligibility(matchId: number) {
    return this.isLosersByeMatch(matchId);
  }

  /**
   * Admin-only: Toggle BYE match status between Waiting, Ready, and Completed
   *
   * Supports reopening completed matches with downstream cascade clearing.
   *
   * @param matchId - Match ID in the brackets-manager database
   * @param makeReady - If true, set to Ready (2). If false, revert to Waiting (1)
   * @param clearDownstream - If true, clear downstream matches when reopening completed match
   */
  async adminToggleByeReady(
    matchId: number,
    makeReady: boolean,
    clearDownstream: boolean = false
  ): Promise<{
    matchId: number;
    status: number;
    statusName: string;
    message: string;
  }> {
    bracketLog(`Admin BYE toggle requested for match ${matchId}`, { makeReady, clearDownstream });

    try {
      const check = await this.isLosersByeMatch(matchId);
      const isCompletedMatch = check.meta?.status === 4;

      // If reopening a completed match
      if (isCompletedMatch && !makeReady) {
        // Check downstream population
        if (!clearDownstream) {
          const downstream = await this.checkDownstreamPopulation(matchId);

          if (downstream.hasDownstream) {
            throw new Error(
              'Cannot reopen completed match: downstream matches have been populated. ' +
                'Use "Reopen + Clear Downstream" option to cascade clear downstream matches.'
            );
          }
        }

        // If clearDownstream is requested, selectively nullify downstream matches
        if (clearDownstream) {
          const downstream = await this.checkDownstreamPopulation(matchId);
          const wpId = downstream.winnerParticipantId;

          for (const downstreamMatch of downstream.downstreamMatches) {
            const updatePayload: Record<string, any> = {
              status: 1, // Reset to Waiting
              opponent1_result: null,
              opponent2_result: null,
              opponent1_score: null,
              opponent2_score: null,
            };

            // Only null the slot that was fed by the reopened match
            if (wpId && downstreamMatch.opponent1?.id === wpId) {
              updatePayload.opponent1_id = null;
            } else if (wpId && downstreamMatch.opponent2?.id === wpId) {
              updatePayload.opponent2_id = null;
            }

            await supabase
              .from('match')
              .update(updatePayload)
              .eq('id', downstreamMatch.id);
          }

          bracketLog('Cleared downstream matches (selective)', {
            matchId,
            clearedCount: downstream.downstreamMatches.length,
            clearedIds: downstream.downstreamMatches.map((m: any) => m.id),
          });
        }

        // Clear current match results and set to Ready for re-scoring
        await supabase
          .from('match')
          .update({
            opponent1_result: null,
            opponent2_result: null,
            opponent1_score: null,
            opponent2_score: null,
            status: 2, // Set to Ready for re-scoring
          })
          .eq('id', matchId);

        successLog(`Reopened completed BYE match ${matchId} to Ready`);

        return {
          matchId,
          status: 2,
          statusName: 'Ready',
          message: clearDownstream
            ? 'Match reopened and downstream matches cleared'
            : 'Match reopened to Ready status',
        };
      }

      // Normal toggle between Waiting and Ready
      if (makeReady) {
        if (!check.ok) {
          throw new Error(
            `Cannot set to Ready: ${check.reason}. ` +
              `Match must be a Losers Bracket BYE match in Locked/Waiting status.`
          );
        }

        await supabase.from('match').update({ status: 2 }).eq('id', matchId);

        successLog(`Admin unlocked BYE match ${matchId} to Ready`);

        return {
          matchId,
          status: 2,
          statusName: 'Ready',
          message:
            'Match unlocked to Ready status. You can now enter scores and advance the bracket.',
        };
      } else {
        if (!check.meta) {
          throw new Error('Cannot revert: Match data unavailable');
        }

        if (check.meta.status >= 4) {
          throw new Error(
            `Cannot revert: Match is ${check.meta.currentStatusName}. ` +
              `Only Ready (2) or Running (3) matches can be reverted.`
          );
        }

        await supabase.from('match').update({ status: 1 }).eq('id', matchId);

        successLog(`Admin reverted BYE match ${matchId} to Waiting`);

        return {
          matchId,
          status: 1,
          statusName: 'Waiting',
          message: 'Match reverted to Waiting status. Status toggle is available again.',
        };
      }
    } catch (error) {
      failureLog('Admin BYE toggle failed', error);
      throw new Error(
        `Failed to toggle BYE match status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a match is a Losers Bracket BYE match eligible for status toggle
   */
  private async isLosersByeMatch(matchId: number): Promise<{
    ok: boolean;
    reason?: string;
    meta?: {
      isLosers: boolean;
      exactlyOneReal: boolean;
      isByeSide: boolean;
      status: number;
      currentStatusName: string;
      opponent1Name: string | null;
      opponent2Name: string | null;
    };
  }> {
    try {
      const matchData = await this.storage.select('match', matchId);
      if (!matchData) {
        return { ok: false, reason: 'Match not found' };
      }

      const round = await this.storage.select('round', matchData.round_id);
      if (!round) {
        return { ok: false, reason: 'Round not found' };
      }

      const group = await this.storage.select('group', round.group_id);
      if (!group) {
        return { ok: false, reason: 'Group not found' };
      }

      const isLosers = group.number === 2;

      let opponent1Name: string | null = null;
      let opponent2Name: string | null = null;

      if (matchData.opponent1?.id) {
        const p1 = await this.storage.select('participant', matchData.opponent1.id);
        opponent1Name = p1?.name || null;
      }

      if (matchData.opponent2?.id) {
        const p2 = await this.storage.select('participant', matchData.opponent2.id);
        opponent2Name = p2?.name || null;
      }

      const o1Real = !!matchData.opponent1?.id && opponent1Name !== null;
      const o2Real = !!matchData.opponent2?.id && opponent2Name !== null;
      const exactlyOneReal = (o1Real ? 1 : 0) + (o2Real ? 1 : 0) === 1;

      const isByeSide =
        !matchData.opponent1?.id ||
        opponent1Name === null ||
        !matchData.opponent2?.id ||
        opponent2Name === null;

      const lockedOrWaiting = matchData.status === 0 || matchData.status === 1;

      const statusNames: Record<number, string> = {
        0: 'Locked',
        1: 'Waiting',
        2: 'Ready',
        3: 'Running',
        4: 'Completed',
        5: 'Archived',
      };

      const meta = {
        isLosers,
        exactlyOneReal,
        isByeSide,
        status: matchData.status,
        currentStatusName: statusNames[matchData.status] || 'Unknown',
        opponent1Name,
        opponent2Name,
      };

      // Allow completed matches for reopening (status 4)
      const isCompletedMatch = matchData.status === 4;
      const isEligible =
        isLosers && exactlyOneReal && isByeSide && (lockedOrWaiting || isCompletedMatch);

      if (!isEligible) {
        let reason = 'Not eligible: ';
        if (!isLosers) reason += 'Not in Losers Bracket. ';
        if (!exactlyOneReal) reason += 'Must have exactly one real team. ';
        if (!isByeSide) reason += 'No BYE detected. ';
        if (!lockedOrWaiting && !isCompletedMatch)
          reason += `Status is ${meta.currentStatusName} (must be Locked, Waiting, or Completed).`;

        return { ok: false, reason: reason.trim(), meta };
      }

      return { ok: true, meta };
    } catch (error) {
      errorLog('Error checking BYE match eligibility:', error);
      return {
        ok: false,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if downstream matches have been populated with this match's winner
   */
  private async checkDownstreamPopulation(matchId: number): Promise<{
    hasDownstream: boolean;
    downstreamMatches: any[];
    winnerParticipantId: number | string | null;
  }> {
    const currentMatch = await this.storage.select('match', matchId);
    if (!currentMatch) {
      return { hasDownstream: false, downstreamMatches: [], winnerParticipantId: null };
    }

    const winnerParticipantId = currentMatch.opponent1?.id || currentMatch.opponent2?.id;
    if (!winnerParticipantId) {
      return { hasDownstream: false, downstreamMatches: [], winnerParticipantId: null };
    }

    // Get current round to determine round number for directionality
    const currentRound = await this.storage.select('round', currentMatch.round_id);
    if (!currentRound) {
      return { hasDownstream: false, downstreamMatches: [], winnerParticipantId };
    }

    // Fetch all rounds for this stage to build a round-number lookup
    const allRounds = await this.storage.select('round', { stage_id: currentMatch.stage_id });
    const roundNumberById = new Map<number | string, number>();
    if (Array.isArray(allRounds)) {
      for (const r of allRounds) {
        roundNumberById.set(r.id, r.number);
      }
    }

    // Get all matches in the same stage
    const allMatches = await this.storage.select('match', { stage_id: currentMatch.stage_id });

    // Only consider matches in strictly later rounds that contain the winner
    const populated = allMatches.filter(
      (m: any) => {
        if (m.id === matchId) return false;
        const hasParticipant =
          m.opponent1?.id === winnerParticipantId ||
          m.opponent2?.id === winnerParticipantId;
        if (!hasParticipant) return false;
        const mRoundNumber = roundNumberById.get(m.round_id);
        return mRoundNumber !== undefined && mRoundNumber > currentRound.number;
      }
    );

    return {
      hasDownstream: populated.length > 0,
      downstreamMatches: populated,
      winnerParticipantId,
    };
  }
}
