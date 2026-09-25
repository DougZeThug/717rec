import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { adminCompleteByeMatch } from './byeCompletion';
import { editMatchTeams } from './editTeams/apply';
import { checkEditTeamsEligibility, getEditTeamsOptions } from './editTeams/options';
import { previewEditMatchTeams } from './editTeams/preview';
import type { EditMatchTeamsParams } from './editTeams/types';
import { isLosersByeMatch } from './eligibility';
import { adminToggleByeReady } from './lifecycle';
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

  editMatchParticipants(params: EditMatchTeamsParams) {
    return editMatchTeams({ storage: this.storage }, params);
  }

  checkEditTeamsEligibility(matchId: number) {
    return checkEditTeamsEligibility({ storage: this.storage }, matchId);
  }

  getEditTeamsOptions(matchId: number) {
    return getEditTeamsOptions({ storage: this.storage }, matchId);
  }

  previewEditMatchTeams(params: EditMatchTeamsParams) {
    return previewEditMatchTeams({ storage: this.storage }, params);
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

  applyLoserBracketRearrange(
    bracketId: string,
    assignments: SlotAssignment[],
    expectedBaseline?: SlotAssignment[]
  ) {
    return applyLoserBracketRearrange(
      { storage: this.storage },
      bracketId,
      assignments,
      expectedBaseline
    );
  }
}
