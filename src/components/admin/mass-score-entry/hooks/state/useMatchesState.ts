import { useState } from 'react';

import { MatchWithTeams } from '../../types';
import { validateMatchScores } from '../../utils/matchValidation';

export const useMatchesState = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  // Stores the original fetched state of matches so we can detect
  // if a match was already completed and reverse old stats before applying new ones
  const [originalMatches, setOriginalMatches] = useState<Map<string, MatchWithTeams>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Wrapper that also captures the original state snapshot
  const setMatchesWithSnapshot = (
    matchesOrUpdater: MatchWithTeams[] | ((prev: MatchWithTeams[]) => MatchWithTeams[])
  ) => {
    if (typeof matchesOrUpdater === 'function') {
      setMatches(matchesOrUpdater);
    } else {
      // When setting fresh fetched data, also snapshot the originals
      const snapshot = new Map<string, MatchWithTeams>();
      matchesOrUpdater.forEach((m) => snapshot.set(m.id, { ...m }));
      setOriginalMatches(snapshot);
      setMatches(matchesOrUpdater);
    }
  };

  // This is for the original style (team1/team2 toggle)
  const handleScoreChange = (index: number, team: 'team1' | 'team2', value: string) => {
    const scoreValue = value === '' ? null : parseInt(value, 10);

    setMatches((prev) => {
      const match = prev[index];
      const newMatches = [...prev];
      const updatedScore =
        team === 'team1' ? { team1Score: scoreValue } : { team2Score: scoreValue };
      const merged = { ...match, ...updatedScore };
      newMatches[index] = {
        ...merged,
        isEdited: true,
        isValid: validateMatchScores(merged.team1Score, merged.team2Score),
      };
      return newMatches;
    });
  };

  const handleMarkCompleted = (index: number, checked: boolean) => {
    setMatches((prev) => {
      const newMatches = [...prev];
      newMatches[index] = {
        ...prev[index],
        iscompleted: checked,
        isEdited: true,
      };
      return newMatches;
    });
  };

  return {
    matches,
    setMatches: setMatchesWithSnapshot,
    originalMatches,
    setOriginalMatches,
    loading,
    setLoading,
    submitting,
    setSubmitting,
    handleScoreChange,
    handleMarkCompleted,
  };
};
