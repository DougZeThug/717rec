
import { format } from "date-fns";

export class TimeslotValidator {
  /**
   * Validate timeslot data before submission
   */
  static validateTimeslotAssignment(date: Date | null, teamId: string | null, timeslot: string | null): { valid: boolean; error?: string } {
    if (!date) {
      return { valid: false, error: 'Date is required' };
    }
    
    if (!teamId) {
      return { valid: false, error: 'Team is required' };
    }
    
    if (!timeslot) {
      return { valid: false, error: 'Timeslot is required' };
    }
    
    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return { valid: false, error: 'Cannot assign timeslots to past dates' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate batch timeslot assignment data
   */
  static validateBatchAssignment(date: Date | null, teamIds: string[], timeslot: string | null): { valid: boolean; error?: string } {
    if (!date) {
      return { valid: false, error: 'Date is required' };
    }
    
    if (!teamIds.length) {
      return { valid: false, error: 'At least one team must be selected' };
    }
    
    if (!timeslot) {
      return { valid: false, error: 'Timeslot is required' };
    }
    
    return { valid: true };
  }
}
