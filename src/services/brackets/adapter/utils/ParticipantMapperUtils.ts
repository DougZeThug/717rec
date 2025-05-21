
/**
 * Utility functions for mapping participant data between formats
 */

import { 
  ParticipantDbRecord, 
  ParticipantRecord 
} from '../types/ParticipantTypes';

/**
 * Maps a database participant record to the format expected by the application
 */
export function mapParticipantDbToRecord(dbRecord: ParticipantDbRecord): ParticipantRecord {
  return {
    id: dbRecord.team_id,
    // Use participant name if available, fall back to team name or position
    name: dbRecord.name || dbRecord.teams?.name || `Team ${dbRecord.position}`,
    tournament_id: dbRecord.tournament_id || dbRecord.bracket_id,
    position: dbRecord.position,
    seeding: dbRecord.seeding
  };
}

/**
 * Maps multiple database records to application records
 */
export function mapParticipantDbRecords(dbRecords: ParticipantDbRecord[]): ParticipantRecord[] {
  if (!dbRecords) return [];
  return dbRecords.map(mapParticipantDbToRecord);
}
