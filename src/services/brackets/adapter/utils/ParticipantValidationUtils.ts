
import { ParticipantInsertData, ParticipantValidationError } from '../types/ParticipantTypes';
import { isValidUUID, isNotEmpty } from '@/utils/validation';

/**
 * Validates participant data before database operations
 */
export function validateParticipantData(data: ParticipantInsertData): void {
  console.log('Validating participant data:', {
    bracket_id: data.bracket_id,
    team_id: data.team_id,
    position: data.position,
    bracket_id_valid: data.bracket_id ? isValidUUID(data.bracket_id) : false, // FIXED: only validate if exists
    team_id_valid: data.team_id ? isValidUUID(data.team_id) : false, // FIXED: only validate if exists
    bracket_id_empty: data.bracket_id === '',
    team_id_empty: data.team_id === ''
  });

  // Check for required fields
  if (!data.bracket_id || data.bracket_id === 'undefined' || data.bracket_id === '') {
    throw new ParticipantValidationError('Bracket ID is required and cannot be empty', { field: 'bracket_id', value: data.bracket_id });
  }

  if (!data.team_id || data.team_id === 'undefined' || data.team_id === '') {
    throw new ParticipantValidationError('Team ID is required and cannot be empty', { field: 'team_id', value: data.team_id });
  }

  // Validate UUID format - FIXED: don't pass empty strings to validation
  if (!isValidUUID(data.bracket_id)) {
    throw new ParticipantValidationError('Bracket ID must be a valid UUID', { field: 'bracket_id', value: data.bracket_id });
  }

  if (!isValidUUID(data.team_id)) {
    throw new ParticipantValidationError('Team ID must be a valid UUID', { field: 'team_id', value: data.team_id });
  }

  if (data.position === undefined || data.position === null || isNaN(data.position)) {
    throw new ParticipantValidationError('Position must be a valid number', { field: 'position', value: data.position });
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
    console.error('Participant validation errors:', errors);
    throw new ParticipantValidationError(
      `${errors.length} participants failed validation`,
      { errors, validCount: validParticipants.length }
    );
  }

  console.log(`Successfully validated ${validParticipants.length} participants`);
  return validParticipants;
}
