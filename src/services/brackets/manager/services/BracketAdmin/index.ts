import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';

import { isLosersByeMatch } from './eligibility';
import { adminToggleByeReady } from './lifecycle';
import { editMatchParticipants } from './participants';

/**
 * Service for admin operations on brackets (BYE handling, match status control)
 */
export class BracketAdminService {
  constructor(private storage: SupabaseSqlStorage) {}

  async checkByeEligibility(matchId: number) {
    return isLosersByeMatch({ storage: this.storage }, matchId);
  }

  async adminToggleByeReady(matchId: number, makeReady: boolean, clearDownstream: boolean = false) {
    return adminToggleByeReady({ storage: this.storage }, matchId, makeReady, clearDownstream);
  }

  async editMatchParticipants(
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
