import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { adminCompleteByeMatch } from './byeCompletion';
import { isLosersByeMatch } from './eligibility';
import { adminToggleByeReady } from './lifecycle';
import { editMatchParticipants } from './participants';
import { applyLoserBracketRearrange } from './rearrange/apply';
import { loadRearrangeBoard } from './rearrange/board';
import type { SlotAssignment } from './rearrange/types';
import type { SwapLoserSlotsParams } from './swap';
import { adminSwapLoserBracketSlots, checkLoserSwapEligibility } from './swap';

/**
 * Service for admin operations on brackets (BYE handling, match status control)
 */
export class BracketAdminService {
  constructor(private storage: SupabaseSqlStorage) {}

  checkByeEligibility(matchId: number) {
    return isLosersByeMatch({ storage: this.storage }, matchId);
  }

  adminToggleByeReady(matchId: number, makeReady: boolean, clearDownstream = false) {
    return adminToggleByeReady({ storage: this.storage }, matchId, makeReady, clearDownstream);
  }

  adminCompleteByeMatch(matchId: number, score = 0) {
    return adminCompleteByeMatch({ storage: this.storage }, matchId, score);
  }

  editMatchParticipants(
    matchId: number,
    newOpponent1TeamId: string | null,
    newOpponent2TeamId: string | null
  ) {
    return editMatchParticipants(
      { storage: this.storage },
      matchId,
      newOpponent1TeamId,
      newOpponent2TeamId
    );
  }

  checkLoserSwapEligibility(matchId: number) {
    return checkLoserSwapEligibility({ storage: this.storage }, matchId);
  }

  adminSwapLoserBracketSlots(params: SwapLoserSlotsParams) {
    return adminSwapLoserBracketSlots({ storage: this.storage }, params);
  }

  getLoserRearrangeBoard(bracketId: string) {
    return loadRearrangeBoard({ storage: this.storage }, bracketId);
  }

  applyLoserBracketRearrange(bracketId: string, assignments: SlotAssignment[]) {
    return applyLoserBracketRearrange({ storage: this.storage }, bracketId, assignments);
  }
}
