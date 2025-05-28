
import { isValidUUID } from '@/utils/validation';
import { assertValidUuid, assertValidUuidOrNull } from '@/utils/uuidValidation';

/**
 * Centralized validation service for bracket operations
 */
export class BracketValidationService {
  /**
   * Validate bracket creation parameters
   */
  static validateBracketCreation(name: string, divisionId: string, teamIds: string[]): void {
    if (!name?.trim()) {
      throw new Error('Bracket name is required');
    }

    if (!divisionId) {
      throw new Error('Division ID is required');
    }

    assertValidUuid(divisionId, 'divisionId');

    if (!teamIds?.length) {
      throw new Error('Teams are required');
    }

    teamIds.forEach((teamId, index) => {
      if (!teamId || !isValidUUID(teamId)) {
        throw new Error(`Invalid team ID at position ${index}: ${teamId}`);
      }
    });
  }

  /**
   * Validate match update parameters
   */
  static validateMatchUpdate(
    matchId: string,
    winnerId: string,
    team1Score: number,
    team2Score: number
  ): void {
    assertValidUuid(matchId, 'matchId');
    assertValidUuid(winnerId, 'winnerId');

    if (typeof team1Score !== 'number' || team1Score < 0) {
      throw new Error('Team 1 score must be a non-negative number');
    }

    if (typeof team2Score !== 'number' || team2Score < 0) {
      throw new Error('Team 2 score must be a non-negative number');
    }

    if (team1Score === team2Score) {
      throw new Error('Match cannot end in a tie');
    }
  }

  /**
   * Validate bracket ID
   */
  static validateBracketId(bracketId: string): void {
    if (!bracketId) {
      throw new Error('Bracket ID is required');
    }
    assertValidUuid(bracketId, 'bracketId');
  }

  /**
   * Validate optional UUID field
   */
  static validateOptionalUuid(value: string | null | undefined, fieldName: string): void {
    assertValidUuidOrNull(value, fieldName);
  }
}
