
import { ParticipantInsertData, ParticipantValidationError } from '../types/ParticipantTypes';

/**
 * Validates participant data before database operations
 */
export function validateParticipantData(data: ParticipantInsertData): void {
  // Check for required fields
  if (!data.bracket_id || data.bracket_id === 'undefined') {
    throw new ParticipantValidationError('Bracket ID is required', { field: 'bracket_id' });
  }

  if (!data.team_id || data.team_id === 'undefined') {
    throw new ParticipantValidationError('Team ID is required', { field: 'team_id' });
  }

  if (data.position === undefined || data.position === null || isNaN(data.position)) {
    throw new ParticipantValidationError('Position must be a valid number', { field: 'position' });
  }

  // Validate position is a positive integer
  if (data.position < 1) {
    throw new ParticipantValidationError('Position must be a positive integer', { 
      field: 'position',
      value: data.position 
    });
  }
}

/**
 * Validates an array of participant data
 * @returns Array of valid participants
 */
export function validateParticipantBatch(participants: ParticipantInsertData[]): ParticipantInsertData[] {
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    throw new ParticipantValidationError('No participants provided');
  }

  const validParticipants: ParticipantInsertData[] = [];
  const errors: any[] = [];

  participants.forEach((participant, index) => {
    try {
      validateParticipantData(participant);
      validParticipants.push(participant);
    } catch (error) {
      if (error instanceof ParticipantValidationError) {
        errors.push({
          index,
          ...error.validationDetails,
          message: error.message
        });
      } else {
        errors.push({
          index,
          message: error instanceof Error ? error.message : 'Unknown validation error'
        });
      }
    }
  });

  if (errors.length > 0) {
    throw new ParticipantValidationError(
      `${errors.length} participants failed validation`,
      { errors, validCount: validParticipants.length }
    );
  }

  return validParticipants;
}
