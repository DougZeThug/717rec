import { useState, useCallback, useEffect } from 'react';
import { AutoScheduleMatch } from '@/types/autoSchedule';
import { validateMatchSchedule, ValidationResult } from '@/utils/autoSchedule/validation';

export const useEditableMatches = (
  currentEditableMatches: AutoScheduleMatch[] = [],
  currentIsEditMode: boolean = false
) => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // Validate whenever editable matches change and we're in edit mode
  useEffect(() => {
    if (currentIsEditMode && currentEditableMatches.length > 0) {
      validateMatchSchedule(currentEditableMatches).then(newValidation => {
        setValidation(newValidation);
      });
    } else {
      setValidation(null);
    }
  }, [currentEditableMatches, currentIsEditMode]);


  /**
   * Update a specific team in a match
   */
  const updateMatchTeam = useCallback((
    matchId: string,
    teamPosition: 'team1' | 'team2',
    newTeamId: string,
    setEditableMatches: (matches: AutoScheduleMatch[]) => void
  ) => {
    setEditableMatches(
      currentEditableMatches.map(match => {
        if (match.id === matchId) {
          return {
            ...match,
            [teamPosition === 'team1' ? 'team1Id' : 'team2Id']: newTeamId
          };
        }
        return match;
      })
    );
  }, [currentEditableMatches]);

  /**
   * Update the timeslot for a match
   */
  const updateMatchTimeslot = useCallback((
    matchId: string, 
    newTimeslot: string,
    setEditableMatches: (matches: AutoScheduleMatch[]) => void
  ) => {
    setEditableMatches(
      currentEditableMatches.map(match => {
        if (match.id === matchId) {
          return {
            ...match,
            timeslot: newTimeslot
          };
        }
        return match;
      })
    );
  }, [currentEditableMatches]);

  /**
   * Swap team1 and team2 in a match
   */
  const swapTeams = useCallback((
    matchId: string,
    setEditableMatches: (matches: AutoScheduleMatch[]) => void
  ) => {
    setEditableMatches(
      currentEditableMatches.map(match => {
        if (match.id === matchId) {
          return {
            ...match,
            team1Id: match.team2Id,
            team2Id: match.team1Id
          };
        }
        return match;
      })
    );
  }, [currentEditableMatches]);

  /**
   * Remove a match from the schedule
   */
  const removeMatch = useCallback((
    matchId: string,
    setEditableMatches: (matches: AutoScheduleMatch[]) => void
  ) => {
    setEditableMatches(
      currentEditableMatches.filter(match => match.id !== matchId)
    );
  }, [currentEditableMatches]);

  /**
   * Reset editable matches to original generated matches
   */
  const resetToGenerated = useCallback((
    generatedMatches: AutoScheduleMatch[],
    setEditableMatches: (matches: AutoScheduleMatch[]) => void
  ) => {
    setEditableMatches(structuredClone(generatedMatches));
    setValidation(null);
  }, []);

  /**
   * Manually trigger validation
   */
  const validateMatches = useCallback(async () => {
    const newValidation = await validateMatchSchedule(currentEditableMatches);
    setValidation(newValidation);
    return newValidation;
  }, [currentEditableMatches]);

  /**
   * Check if there are unsaved edits
   */
  const hasUnsavedEdits = useCallback((generatedMatches: AutoScheduleMatch[]) => {
    if (currentEditableMatches.length !== generatedMatches.length) return true;
    
    return currentEditableMatches.some((editedMatch, index) => {
      const originalMatch = generatedMatches[index];
      return editedMatch.team1Id !== originalMatch.team1Id ||
             editedMatch.team2Id !== originalMatch.team2Id ||
             editedMatch.timeslot !== originalMatch.timeslot;
    });
  }, [currentEditableMatches]);

  return {
    validation,
    updateMatchTeam,
    updateMatchTimeslot,
    swapTeams,
    removeMatch,
    resetToGenerated,
    validateMatches,
    hasUnsavedEdits
  };
};
