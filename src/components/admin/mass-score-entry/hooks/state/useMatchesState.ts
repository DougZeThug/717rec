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
  const setMatchesWithSnapshot = (matchesOrUpdater: MatchWithTeams[] | ((prev: MatchWithTeams[]) => MatchWithTeams[])) => {
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
    const newMatches = [...matches];
    const scoreValue = value === '' ? null : parseInt(value, 10);
    const match = newMatches[index];

    if (team === 'team1') {
      match.team1Score = scoreValue;
    } else {
      match.team2Score = scoreValue;
    }

    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    setMatches(newMatches);
  };

  const handleMarkCompleted = (index: number, checked: boolean) => {
    const newMatches = [...matches];
    newMatches[index].iscompleted = checked;
    newMatches[index].isEdited = true;
    setMatches(newMatches);
  };

  return {
    matches,
    setMatches: setMatchesWithSnapshot,
    originalMatches,
    loading,
    setLoading,
    submitting,
    setSubmitting,
    handleScoreChange,
    handleMarkCompleted,
  };
};
