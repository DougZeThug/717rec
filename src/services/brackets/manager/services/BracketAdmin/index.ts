import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { adminCompleteByeMatch } from './byeCompletion';
import { isLosersByeMatch } from './eligibility';
import { adminToggleByeReady } from './lifecycle';
import { editMatchParticipants } from './participants';

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
}
