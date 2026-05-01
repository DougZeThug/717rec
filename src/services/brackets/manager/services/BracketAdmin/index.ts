import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';

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
