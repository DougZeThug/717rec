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
          const downstream = await this.collectDownstreamChain(matchId);

          if (downstream.length > 0) {
            throw new Error(
              'Cannot reopen completed match: downstream matches have been populated. ' +
                'Use "Reopen + Clear Downstream" option to cascade clear downstream matches.'
            );
          }
        }

        // If clearDownstream is requested, cascade-clear all downstream matches
        if (clearDownstream) {
          const downstream = await this.collectDownstreamChain(matchId);

          for (const downstreamMatch of downstream) {
            await supabase
              .from('match')
              .update({
                status: 1,
                opponent1_id: null,
                opponent2_id: null,
                opponent1_result: null,
                opponent2_result: null,
                opponent1_score: null,
                opponent2_score: null,
              })
              .eq('id', downstreamMatch.id);
          }

          bracketLog('Cleared downstream matches (full cascade)', {
            matchId,
            clearedCount: downstream.length,
            clearedIds: downstream.map((m: any) => m.id),
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
        `Failed to toggle BYE match status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
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
   * Collect all downstream matches by following the advancement chain.
   * Starts from the given match's winner and recursively collects matches
   * where any cleared participant (or subsequent winners) advanced to.
   */
  private async collectDownstreamChain(matchId: number): Promise<any[]> {
    const currentMatch = await this.storage.select('match', matchId);
    if (!currentMatch) return [];

    const currentRound = await this.storage.select('round', currentMatch.round_id);
    if (!currentRound) return [];

    // Build round-number lookup
    const allRounds = await this.storage.select('round', { stage_id: currentMatch.stage_id });
    const roundNumberById = new Map<number | string, number>();
    if (Array.isArray(allRounds)) {
      for (const r of allRounds) roundNumberById.set(r.id, r.number);
    }

    // Get all matches in the same stage, sorted by round number ascending
    const allMatches = (
      await this.storage.select('match', { stage_id: currentMatch.stage_id })
    ).filter((m: any) => {
      if (m.id === matchId) return false;
      const rn = roundNumberById.get(m.round_id);
      return rn !== undefined && rn > currentRound.number;
    });

    allMatches.sort((a: any, b: any) => {
      const ra = roundNumberById.get(a.round_id) ?? 0;
      const rb = roundNumberById.get(b.round_id) ?? 0;
      return ra - rb;
    });

    // Seed the set of participant IDs to track with the original winner
    const trackedIds = new Set<number | string>();
    const winnerId = currentMatch.opponent1?.id || currentMatch.opponent2?.id;
    if (winnerId) trackedIds.add(winnerId);
    if (trackedIds.size === 0) return [];

    const result: any[] = [];

    for (const m of allMatches) {
      const o1 = m.opponent1?.id;
      const o2 = m.opponent2?.id;
      const hasTracked = (o1 && trackedIds.has(o1)) || (o2 && trackedIds.has(o2));

      if (hasTracked) {
        result.push(m);
        // If this match has a winner, track them too (chain follows)
        if (o1 && !trackedIds.has(o1)) trackedIds.add(o1);
        if (o2 && !trackedIds.has(o2)) trackedIds.add(o2);
      }
    }

    return result;
  }
}
